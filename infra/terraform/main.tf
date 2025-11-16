# SoilViews Terraform Infrastructure
# AWS EKS, RDS PostgreSQL, S3, Lambda, EFS

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "soilviews-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "soilviews-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SoilViews"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC and Networking
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "soilviews-${var.environment}"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "production"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    "kubernetes.io/cluster/soilviews-${var.environment}" = "shared"
  }
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "soilviews-${var.environment}"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    main = {
      min_size     = 2
      max_size     = 10
      desired_size = 3

      instance_types = ["m5.large"]
      capacity_type  = "SPOT" # Cost optimization

      labels = {
        workload = "general"
      }
    }
  }

  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
  }
}

# RDS PostgreSQL + PostGIS
resource "aws_db_instance" "postgres" {
  identifier     = "soilviews-${var.environment}"
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = "db.t4g.medium"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "soilviews"
  username = "soilviews"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  multi_az               = var.environment == "production"
  publicly_accessible    = false
  skip_final_snapshot    = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "soilviews-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name = "soilviews-postgres-${var.environment}"
  }
}

# S3 Bucket for COGs
resource "aws_s3_bucket" "cogs" {
  bucket = "soilviews-cogs-${var.environment}"

  tags = {
    Name        = "SoilViews COG Storage"
    CostCenter  = "infrastructure"
    DataType    = "cloud-optimized-geotiffs"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "cogs_lifecycle" {
  bucket = aws_s3_bucket.cogs.id

  rule {
    id     = "intelligent-tiering"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "INTELLIGENT_TIERING"
    }

    transition {
      days          = 365
      storage_class = "GLACIER_INSTANT_RETRIEVAL"
    }
  }
}

# Lambda for ML Inference
resource "aws_lambda_function" "inference" {
  function_name = "soilviews-inference-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn

  package_type  = "Image"
  image_uri     = "${var.ecr_repository_url}:latest"
  architectures = ["arm64"] # ADR-006: ARM for cost savings

  memory_size = 10240 # 10 GB
  timeout     = 300   # 5 minutes

  file_system_config {
    arn              = aws_efs_access_point.lambda_models.arn
    local_mount_path = "/mnt/models"
  }

  vpc_config {
    subnet_ids         = module.vpc.private_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      MODEL_PATH = "/mnt/models/soilviews-efficientnet-b3.pt"
      S3_BUCKET  = aws_s3_bucket.cogs.id
    }
  }
}

# EFS for Model Cache
resource "aws_efs_file_system" "lambda_models" {
  creation_token = "soilviews-lambda-models-${var.environment}"
  encrypted      = true

  tags = {
    Name = "SoilViews Lambda Model Cache"
  }
}

resource "aws_efs_access_point" "lambda_models" {
  file_system_id = aws_efs_file_system.lambda_models.id

  posix_user {
    gid = 1000
    uid = 1000
  }

  root_directory {
    path = "/models"
    creation_info {
      owner_gid   = 1000
      owner_uid   = 1000
      permissions = "755"
    }
  }
}

# Outputs
output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "s3_bucket_name" {
  value = aws_s3_bucket.cogs.id
}

output "lambda_function_arn" {
  value = aws_lambda_function.inference.arn
}
