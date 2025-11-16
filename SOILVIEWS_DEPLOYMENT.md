# SoilViews Deployment Guide

**Production-ready deployment instructions for SoilViews platform.**

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Production Deployment (AWS)](#production-deployment-aws)
- [Database Migrations](#database-migrations)
- [Monitoring & Observability](#monitoring--observability)
- [Disaster Recovery](#disaster-recovery)
- [Cost Optimization](#cost-optimization)

---

## Prerequisites

### Required Tools

- **Node.js** ≥ 20.0.0
- **pnpm** ≥ 8.0.0
- **Docker** & **Docker Compose** ≥ 24.0
- **Terraform** ≥ 1.6
- **kubectl** ≥ 1.28
- **Helm** ≥ 3.12
- **AWS CLI** ≥ 2.0
- **Python** ≥ 3.11 (for ML pipeline)

### AWS Account Setup

1. **Create AWS account** with billing alerts
2. **Create IAM user** with programmatic access:
   ```bash
   aws iam create-user --user-name soilviews-deployer
   aws iam attach-user-policy --user-name soilviews-deployer \
     --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
   ```
3. **Configure AWS CLI**:
   ```bash
   aws configure --profile soilviews-prod
   export AWS_PROFILE=soilviews-prod
   ```

### Required Secrets

Create `.env.production` with the following secrets (never commit!):

```bash
# Database
DATABASE_PASSWORD=<strong-password-32-chars>

# JWT
JWT_SECRET=<random-secret-64-chars>
JWT_REFRESH_SECRET=<random-secret-64-chars>

# Sentinel-Hub API (https://www.sentinel-hub.com/)
SENTINEL_HUB_CLIENT_ID=<your-client-id>
SENTINEL_HUB_CLIENT_SECRET=<your-client-secret>
SENTINEL_HUB_INSTANCE_ID=<your-instance-id>

# AWS
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
```

---

## Local Development

### 1. Install Dependencies

```bash
# Clone repository
git clone https://github.com/yourusername/soilviews.git
cd soilviews

# Install Node dependencies
pnpm install

# Install Python dependencies (ML pipeline)
cd packages/ml-pipeline
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 2. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, MinIO, Unleash
docker-compose -f infra/docker-compose.dev.yml up -d

# Wait for services to be healthy (30-60 seconds)
docker-compose -f infra/docker-compose.dev.yml ps

# Check PostgreSQL is ready
docker-compose -f infra/docker-compose.dev.yml exec postgres \
  pg_isready -U soilviews
```

### 3. Run Database Migrations

```bash
# Copy environment template
cp .env.example .env

# Run migrations
pnpm --filter api db:migrate

# Seed sample data
pnpm --filter api db:seed
```

### 4. Start Development Servers

```bash
# Terminal 1: API (NestJS)
pnpm --filter api dev
# Running on http://localhost:3000
# Swagger docs: http://localhost:3000/api/docs

# Terminal 2: Web (React + Vite)
pnpm --filter web dev
# Running on http://localhost:5173
```

### 5. Verify Local Setup

```bash
# Health check
curl http://localhost:3000/api/health

# MinIO console
open http://localhost:9001  # minioadmin / minioadmin

# Unleash dashboard
open http://localhost:4242  # admin / unleash4all

# pgAdmin
open http://localhost:5050  # admin@soilviews.local / admin
```

---

## Production Deployment (AWS)

### Step 1: Create Terraform State Backend

```bash
cd infra/terraform

# Create S3 bucket for Terraform state
aws s3 mb s3://soilviews-terraform-state --region eu-central-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket soilviews-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name soilviews-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-central-1
```

### Step 2: Provision Infrastructure with Terraform

```bash
cd infra/terraform

# Initialize Terraform
terraform init

# Create production workspace
terraform workspace new production

# Plan infrastructure
terraform plan \
  -var="environment=production" \
  -var="db_password=${DATABASE_PASSWORD}" \
  -var="ecr_repository_url=${ECR_REPO_URL}" \
  -out=tfplan

# Review plan carefully!
# Expected resources: VPC, EKS, RDS, S3, Lambda, EFS, Security Groups, IAM Roles

# Apply infrastructure
terraform apply tfplan

# Save outputs
terraform output -json > terraform-outputs.json
```

**Expected provisioning time**: 20-30 minutes (EKS cluster creation is slow)

### Step 3: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region eu-central-1 | \
  docker login --username AWS --password-stdin ${ECR_REPO_URL}

# Build API image
cd packages/api
docker build -t soilviews-api:latest .
docker tag soilviews-api:latest ${ECR_REPO_URL}/api:latest
docker push ${ECR_REPO_URL}/api:latest

# Build Web image
cd ../web
docker build -t soilviews-web:latest .
docker tag soilviews-web:latest ${ECR_REPO_URL}/web:latest
docker push ${ECR_REPO_URL}/web:latest

# Build Lambda ML inference image (ARM architecture)
cd ../ml-pipeline
docker build --platform linux/arm64 -t soilviews-lambda:latest .
docker tag soilviews-lambda:latest ${ECR_REPO_URL}/lambda:latest
docker push ${ECR_REPO_URL}/lambda:latest
```

### Step 4: Upload ML Model to EFS

```bash
# Download trained model (replace with your model path)
aws s3 cp s3://your-models-bucket/soilviews-efficientnet-b3.pt ./model.pt

# Upload to EFS via EC2 instance (one-time setup)
# 1. Launch temporary EC2 instance in same VPC
# 2. Mount EFS file system
# 3. Copy model.pt to /mnt/efs/models/
# 4. Terminate EC2 instance

# Or use EFS file system helper (if available)
```

### Step 5: Deploy to Kubernetes with Helm

```bash
cd infra/helm

# Update kubeconfig
aws eks update-kubeconfig --name soilviews-production --region eu-central-1

# Verify connection
kubectl get nodes

# Create production namespace
kubectl create namespace production

# Create secrets
kubectl create secret generic soilviews-secrets \
  --namespace production \
  --from-env-file=../../.env.production

# Deploy with Helm
helm upgrade --install soilviews ./soilviews \
  --namespace production \
  --values ./soilviews/values.prod.yaml \
  --set image.tag=latest \
  --set api.replicas=3 \
  --set web.replicas=2 \
  --timeout 10m

# Wait for rollout
kubectl rollout status deployment/soilviews-api -n production
kubectl rollout status deployment/soilviews-web -n production
```

### Step 6: Configure DNS and SSL

```bash
# Get LoadBalancer URL
kubectl get svc soilviews-api -n production -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Create Route53 CNAME records
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://route53-changes.json

# Install cert-manager for SSL (Let's Encrypt)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer and Certificate resources
kubectl apply -f infra/k8s/cert-manager/
```

### Step 7: Run Database Migrations (Production)

```bash
# Port-forward to RDS via kubectl
kubectl port-forward svc/soilviews-api 5432:5432 -n production &

# Run migrations
export DATABASE_HOST=localhost
pnpm --filter api db:migrate

# Stop port-forward
kill %1
```

### Step 8: Smoke Tests

```bash
# Health check
curl -f https://api.soilviews.bg/api/health

# Swagger docs
open https://api.soilviews.bg/api/docs

# Web app
open https://app.soilviews.bg

# Lambda inference test
aws lambda invoke \
  --function-name soilviews-inference-production \
  --payload '{"cog_url":"s3://soilviews-cogs/test.tif","field_id":"test-123"}' \
  --region eu-central-1 \
  response.json

cat response.json
```

---

## Database Migrations

### Create New Migration

```bash
cd packages/api

# Generate migration from entity changes
pnpm db:migrate:generate src/database/migrations/AddSoilDepthColumn

# Edit migration file (src/database/migrations/*.ts)
# Add up() and down() methods

# Test locally
pnpm db:migrate

# Revert if needed
pnpm db:migrate:revert
```

### Production Migration Process

1. **Backup database** before migration
2. **Test on staging** environment first
3. **Schedule maintenance window** (if downtime expected)
4. **Run migration** during low-traffic period
5. **Monitor** for errors (CloudWatch Logs)
6. **Rollback plan** ready (db:migrate:revert)

---

## Monitoring & Observability

### Metrics (CloudWatch)

- **API Response Time** (P50, P95, P99)
- **Database Connections** (active, idle)
- **Lambda Invocations** (count, duration, errors)
- **S3 Requests** (GET, PUT)
- **EKS Node CPU/Memory**

### Logs

```bash
# API logs
kubectl logs -f deployment/soilviews-api -n production

# Lambda logs
aws logs tail /aws/lambda/soilviews-inference-production --follow

# Database logs
aws rds describe-db-log-files --db-instance-identifier soilviews-production
```

### Alerts (CloudWatch Alarms)

- **API Error Rate** > 5% (5 min)
- **Database CPU** > 80% (10 min)
- **Lambda Errors** > 10 (5 min)
- **EKS Node NotReady** (1 min)

### Dashboards

- **Grafana** (optional): Install via Helm chart
- **CloudWatch Dashboard**: Pre-configured in `infra/cloudwatch/`

---

## Disaster Recovery

### RTO: 4 hours | RPO: 15 minutes

### Backup Strategy

1. **RDS Automated Snapshots**: Daily, 7-day retention
2. **S3 Versioning + Cross-Region Replication**: Enabled on `soilviews-cogs`
3. **PostgreSQL WAL Archiving**: To S3, point-in-time recovery
4. **EKS ETCD Snapshots**: Daily via Velero

### Restore Procedure

#### Database Restore

```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier soilviews-production-restored \
  --db-snapshot-identifier soilviews-production-2024-01-15

# Point-in-time recovery (within 7 days)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier soilviews-production \
  --target-db-instance-identifier soilviews-production-restored \
  --restore-time 2024-01-15T12:00:00Z
```

#### S3 Restore

```bash
# Restore from version
aws s3api get-object-version \
  --bucket soilviews-cogs \
  --key soil-ph-field-123.tif \
  --version-id abc123 \
  soil-ph-field-123-restored.tif
```

---

## Cost Optimization

### Target: €0.10/ha/year at 1M ha scale

#### Current Cost Breakdown (Monthly for 1M ha)

| Service              | Configuration       | Cost/Month | Optimization                        |
| -------------------- | ------------------- | ---------- | ----------------------------------- |
| EKS                  | 3× m5.large (Spot)  | €220       | Use Spot instances (70% savings)    |
| RDS                  | db.t4g.medium       | €65        | ARM instance, reserved pricing      |
| S3                   | 5 TB (COGs)         | €115       | Intelligent-Tiering after 90 days   |
| Lambda (Inference)   | ARM, 10 GB          | €180       | Provisioned concurrency = 2 only    |
| EFS                  | 1 GB (models)       | €0.30      | Minimal usage                       |
| CloudWatch           | 7-day retention     | €15        | Reduce metrics granularity          |
| Data Transfer        | CloudFront CDN      | €80        | 80% cache hit rate                  |
| **Total**            |                     | **€675**   | **€0.068/ha** ✅ (below target)     |

#### Cost Reduction Tips

1. **Use Reserved Instances** for RDS (40% savings)
2. **Spot Instances** for EKS nodes (70% savings)
3. **S3 Lifecycle Policies** (move old COGs to Glacier)
4. **Lambda Concurrency Limits** (prevent runaway costs)
5. **CloudFront Caching** (reduce origin requests)
6. **Shutdown Non-Prod** environments outside business hours

---

## Production Checklist

Before going live, verify:

- ✅ SSL certificates installed (HTTPS only)
- ✅ DNS configured (api.soilviews.bg, app.soilviews.bg)
- ✅ Database backups enabled (7-day retention)
- ✅ Monitoring dashboards configured
- ✅ CloudWatch alarms active
- ✅ Secrets in AWS Secrets Manager (not .env files)
- ✅ Rate limiting enabled (100 req/15 min)
- ✅ CORS configured correctly
- ✅ GDPR compliance verified (cookie consent, data export)
- ✅ Disaster recovery plan tested
- ✅ Cost alerts configured (AWS Budgets)
- ✅ Security scan passed (Snyk, OWASP)
- ✅ Penetration testing completed
- ✅ Load testing passed (k6 or Locust)
- ✅ Documentation updated

---

## Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/soilviews/issues)
- **Email**: devops@soilviews.bg
- **On-call**: PagerDuty integration (production only)

---

**✅ SoilViews is production-ready! See you in the fields. 🌾**
