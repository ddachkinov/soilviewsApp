# Security Groups for SoilViews Infrastructure

resource "aws_security_group" "rds" {
  name_prefix = "soilviews-rds-${var.environment}"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id, aws_security_group.lambda.id]
    description     = "Allow PostgreSQL from EKS and Lambda"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "soilviews-rds-${var.environment}"
  }
}

resource "aws_security_group" "lambda" {
  name_prefix = "soilviews-lambda-${var.environment}"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "soilviews-lambda-${var.environment}"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "soilviews-${var.environment}"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Name = "soilviews-db-subnet-group-${var.environment}"
  }
}
