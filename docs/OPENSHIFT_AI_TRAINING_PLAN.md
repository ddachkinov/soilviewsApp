# SoilViews Training on Red Hat OpenShift AI - 90-Day Implementation Plan

**Document Version**: 1.0
**Date**: 2025-01-18
**Trial Period**: 90 days
**Target**: Complete migration and production-ready model deployment

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Overview](#platform-overview)
3. [Architecture Comparison](#architecture-comparison)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Data Migration Strategy](#data-migration-strategy)
6. [Training Pipeline Design](#training-pipeline-design)
7. [Distributed Training with Ray](#distributed-training-with-ray)
8. [Model Serving with KServe](#model-serving-with-kserve)
9. [MLOps Workflow](#mlops-workflow)
10. [Cost Analysis](#cost-analysis)
11. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

### Current State
- **Model**: EfficientNet-b3 + DeepLabV3+ (PyTorch Lightning)
- **Training**: Local GPU or AWS SageMaker
- **Serving**: AWS Lambda (TorchScript)
- **Data**: 5,000-18,340 Bulgarian soil samples + Sentinel-2/1 imagery

### Proposed State (OpenShift AI)
- **Platform**: Red Hat OpenShift AI on trial (90 days)
- **Training**: Ray + CodeFlare distributed training
- **Serving**: KServe model serving (Serverless or RawDeployment)
- **MLOps**: Integrated pipelines with Tekton/Kubeflow
- **Benefits**:
  - ✅ Multi-GPU distributed training (faster iteration)
  - ✅ Kubernetes-native deployment
  - ✅ Vendor-neutral (avoid AWS lock-in)
  - ✅ Built-in experiment tracking
  - ✅ Production-grade model serving
  - ✅ EU data residency options

### Key Decision Points

| Factor | AWS SageMaker | **OpenShift AI** | IBM Watson X |
|--------|---------------|------------------|--------------|
| **Trial Available** | No | **✅ 90 days** | No |
| **Multi-GPU Training** | Yes (expensive) | **✅ Yes (Ray)** | Yes |
| **Vendor Lock-in** | High | **Low (K8s)** | Medium |
| **Cost (estimated)** | €3.50/hr | **€2.00/hr** | €5.00/hr |
| **EU Data Residency** | Limited | **✅ Flexible** | ✅ Yes |
| **Learning Curve** | Medium | **High** | Medium |
| **Production Ready** | ✅ Yes | **✅ Yes** | ✅ Yes |

**Recommendation**: Use the 90-day trial to:
1. **Weeks 1-4**: Setup, data migration, basic training
2. **Weeks 5-8**: Distributed training optimization, hyperparameter tuning
3. **Weeks 9-12**: Production deployment, KServe integration, cost analysis
4. **Day 90 Decision**: Continue with OpenShift AI or migrate back to SageMaker/Watson X

---

## Platform Overview

### What is Red Hat OpenShift AI?

Red Hat OpenShift AI (formerly OpenShift Data Science) is an **enterprise MLOps platform** built on Kubernetes that provides:

#### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│ Red Hat OpenShift AI Platform                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Development Tools                                          │
│  ├── JupyterLab (pre-configured with ML libraries)         │
│  ├── VS Code (optional)                                    │
│  └── Custom notebooks (PyTorch, TensorFlow, etc.)          │
│                                                             │
│  Distributed Training                                       │
│  ├── Ray + CodeFlare (parallel training)                   │
│  ├── KubeRay Operator (Ray cluster management)             │
│  ├── Training Operator (TensorFlow, PyTorch jobs)          │
│  ├── Kueue (resource quota management)                     │
│  └── GPU support (NVIDIA, Intel Gaudi)                     │
│                                                             │
│  Data Management                                            │
│  ├── S3-compatible object storage (MinIO, AWS S3, etc.)    │
│  ├── Persistent Volume Claims (PVCs)                       │
│  └── Data versioning (DVC integration)                     │
│                                                             │
│  Model Serving                                              │
│  ├── KServe (serverless inference)                         │
│  ├── ModelMesh (multi-model serving)                       │
│  ├── RawDeployment mode (edge/embedded)                    │
│  └── Autoscaling (HPA, KEDA)                               │
│                                                             │
│  MLOps                                                       │
│  ├── Kubeflow Pipelines (workflow orchestration)           │
│  ├── Tekton Pipelines (CI/CD)                              │
│  ├── Model Registry (versioning, governance)               │
│  └── Monitoring (Prometheus, Grafana)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Key Features for SoilViews

| Feature | Description | SoilViews Use Case |
|---------|-------------|-------------------|
| **Ray + CodeFlare** | Distributed training framework | Train on multiple GPUs simultaneously for faster experimentation |
| **KServe** | Kubernetes-native model serving | Deploy trained models as REST APIs for production inference |
| **JupyterLab** | Interactive development | Data exploration, model prototyping, visualization |
| **GPU Acceleration** | NVIDIA/Intel Gaudi support | Train EfficientNet-b3 on V100/A100 GPUs |
| **S3 Integration** | Object storage for datasets | Store Sentinel-2 COGs and soil samples |
| **Experiment Tracking** | Built-in metrics logging | Track R², RMSE, hyperparameters across runs |
| **Pipeline Orchestration** | Kubeflow/Tekton | Automate: data prep → train → validate → deploy |

---

## Architecture Comparison

### Current Architecture (AWS-based)

```
┌────────────────────────────────────────────────────────────┐
│ Current SoilViews ML Pipeline (AWS)                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Data Storage                                           │
│     └── S3 Bucket (Sentinel-2 COGs, soil samples)         │
│                                                            │
│  2. Training                                               │
│     ├── Option A: Local GPU (RTX 4090)                    │
│     ├── Option B: SageMaker (ml.p3.2xlarge, €3.50/hr)    │
│     └── Option C: IBM Watson X (€5.00/hr)                 │
│                                                            │
│  3. Model Export                                           │
│     └── TorchScript (.pt) for Lambda                      │
│                                                            │
│  4. Inference                                              │
│     └── AWS Lambda + EFS (CPU inference)                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Proposed Architecture (OpenShift AI)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Proposed SoilViews ML Pipeline (Red Hat OpenShift AI)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Data Layer                                                              │
│     ├── S3-compatible storage (MinIO or AWS S3)                            │
│     │   ├── Sentinel-2 COGs (10m resolution, 8 bands)                      │
│     │   ├── Sentinel-1 SAR (VV/VH polarization)                            │
│     │   └── Ground-truth samples (18,340 Bulgarian samples)                │
│     └── PersistentVolumeClaims (PVCs)                                      │
│         └── Training checkpoints, artifacts                                │
│                                                                             │
│  2. Development & Experimentation                                           │
│     ├── JupyterLab Notebook                                                │
│     │   ├── Python 3.11 + PyTorch 2.1 environment                          │
│     │   ├── segmentation-models-pytorch, timm, rasterio                    │
│     │   └── Interactive exploration (EDA, visualization)                   │
│     └── VS Code Server (optional)                                          │
│                                                                             │
│  3. Distributed Training (Ray + CodeFlare)                                  │
│     ├── Ray Cluster (KubeRay Operator)                                     │
│     │   ├── Head Node: 1× CPU node (orchestration)                         │
│     │   └── Worker Nodes: 2-4× GPU nodes (V100/A100)                       │
│     ├── CodeFlare SDK                                                       │
│     │   ├── Cluster autoscaling (InstaScale)                               │
│     │   ├── Job scheduling (MCAD - Multi-Cluster App Dispatcher)           │
│     │   └── Resource quota management (Kueue)                              │
│     └── PyTorch Lightning on Ray                                           │
│         ├── RayStrategy for DDP (Distributed Data Parallel)                │
│         └── Automatic model checkpointing to S3                            │
│                                                                             │
│  4. Experiment Tracking & Model Registry                                    │
│     ├── MLflow (or built-in tracking)                                      │
│     │   ├── Log hyperparameters, metrics (R², RMSE)                        │
│     │   ├── Track artifacts (model checkpoints, plots)                     │
│     │   └── Compare experiments side-by-side                               │
│     └── Model Registry                                                      │
│         ├── Version models (v1.0, v1.1, etc.)                              │
│         ├── Tag production-ready models                                    │
│         └── Governance metadata (training data, accuracy)                  │
│                                                                             │
│  5. Model Serving (KServe)                                                  │
│     ├── InferenceService (Serverless mode)                                 │
│     │   ├── PyTorch Server runtime                                         │
│     │   ├── Auto-scaling (0 to N replicas)                                 │
│     │   └── Canary deployments (A/B testing)                               │
│     └── RawDeployment mode (alternative for edge)                          │
│         ├── Deployment without service mesh                                │
│         └── Lower overhead for resource-constrained environments           │
│                                                                             │
│  6. CI/CD Pipeline (Tekton)                                                 │
│     ├── Trigger: Git push to main branch                                   │
│     ├── Steps:                                                              │
│     │   1. Fetch new soil samples from PostgreSQL                          │
│     │   2. Preprocess data (extract Sentinel-2 pixels)                     │
│     │   3. Train model with Ray (distributed)                              │
│     │   4. Validate on held-out municipalities                             │
│     │   5. If R² ≥ 0.78 → promote to Model Registry                        │
│     │   6. Deploy to KServe (canary: 10% traffic → 100%)                   │
│     └── Notifications: Slack/email on completion                           │
│                                                                             │
│  7. Monitoring & Observability                                              │
│     ├── Prometheus (metrics)                                               │
│     │   ├── GPU utilization, training loss, throughput                     │
│     │   └── Inference latency, request rate, error rate                    │
│     └── Grafana (dashboards)                                               │
│         ├── Training progress visualization                                │
│         └── Model serving health                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ Optional: Hybrid Deployment
         ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ AWS Lambda (Existing Production Inference)                                  │
│ ├── Load TorchScript model from S3/EFS                                      │
│ └── Serve predictions to SoilViews API                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Differences

| Aspect | Current (AWS) | Proposed (OpenShift AI) |
|--------|---------------|------------------------|
| **Training Speed** | Single GPU (12-16 hrs) | **Multi-GPU distributed (4-6 hrs)** |
| **Experimentation** | Manual SageMaker jobs | **Interactive Jupyter + Ray clusters** |
| **Model Versioning** | Manual S3 uploads | **Built-in Model Registry** |
| **CI/CD** | GitHub Actions → Lambda | **Tekton Pipelines (K8s-native)** |
| **Inference** | Lambda (serverless) | **KServe (K8s-native) + Lambda (optional)** |
| **Vendor Lock-in** | High (AWS-specific) | **Low (portable to any K8s)** |
| **Cost (training)** | €84/24hrs (SageMaker) | **€48-60/24hrs (OpenShift AI)** |
| **EU Compliance** | Requires specific setup | **Flexible (deploy in EU regions)** |

---

## Implementation Roadmap

### 90-Day Trial Timeline

```
Week 1-2: Setup & Onboarding (Days 1-14)
├── Day 1-2: OpenShift AI trial activation
│   ├── Sign up for Red Hat Developer account
│   ├── Provision OpenShift AI sandbox (or ROSA - Red Hat OpenShift on AWS)
│   └── Verify GPU quota (request V100/A100 nodes)
├── Day 3-5: Development environment setup
│   ├── Launch JupyterLab notebook server
│   ├── Install dependencies (PyTorch, Lightning, segmentation-models-pytorch)
│   ├── Configure S3 access (AWS S3 or MinIO)
│   └── Test basic PyTorch training on single GPU
├── Day 6-10: Data migration
│   ├── Upload Sentinel-2 COGs to S3-compatible storage
│   ├── Upload soil sample Parquet files
│   ├── Create PVCs for checkpoints
│   └── Verify data loading in Jupyter
└── Day 11-14: Baseline training
    ├── Port existing PyTorch Lightning code
    ├── Run single-GPU training (sanity check)
    ├── Validate R² ≥ 0.78 baseline
    └── Document any issues

Week 3-4: Distributed Training with Ray (Days 15-28)
├── Day 15-18: Ray cluster setup
│   ├── Install CodeFlare operator
│   ├── Create Ray cluster with KubeRay (1 head + 2 workers)
│   ├── Test Ray connectivity from Jupyter
│   └── Run simple distributed PyTorch example
├── Day 19-22: PyTorch Lightning + Ray integration
│   ├── Convert training script to use RayStrategy
│   ├── Implement distributed data loading
│   ├── Test 2-GPU training run
│   └── Benchmark speed vs single-GPU (target: 1.8x faster)
├── Day 23-25: Hyperparameter tuning
│   ├── Use Ray Tune for learning rate, batch size optimization
│   ├── Run parallel experiments (5-10 configs simultaneously)
│   └── Select best hyperparameters
└── Day 26-28: Full training run
    ├── Train final model on all 18,340 samples
    ├── 4-GPU distributed training (target: 4-6 hours)
    ├── Achieve R² ≥ 0.80 (improvement over baseline)
    └── Save best checkpoint to S3

Week 5-6: Model Registry & Serving (Days 29-42)
├── Day 29-32: Model Registry integration
│   ├── Register trained model with metadata
│   ├── Version models (v1.0-baseline, v1.1-distributed)
│   ├── Tag production candidate
│   └── Document model lineage (dataset version, hyperparams)
├── Day 33-36: KServe deployment
│   ├── Create InferenceService YAML
│   ├── Deploy PyTorch model to KServe
│   ├── Test REST API endpoint (/v1/models/soilviews:predict)
│   └── Benchmark latency (target: <5s for 20ha field)
├── Day 37-39: Autoscaling configuration
│   ├── Configure Horizontal Pod Autoscaler (HPA)
│   ├── Set min replicas: 0, max replicas: 5
│   ├── Load test with simulated requests
│   └── Verify scale-to-zero (cost savings)
└── Day 40-42: Canary deployment
    ├── Deploy new model version (90% old, 10% new)
    ├── Monitor metrics (latency, accuracy)
    ├── Gradually shift to 100% new model
    └── Rollback strategy documented

Week 7-8: MLOps Pipeline (Days 43-56)
├── Day 43-47: Tekton pipeline setup
│   ├── Install Tekton Pipelines operator
│   ├── Create pipeline tasks:
│   │   ├── Task 1: Fetch data from PostgreSQL
│   │   ├── Task 2: Preprocess (extract Sentinel-2 pixels)
│   │   ├── Task 3: Train with Ray
│   │   ├── Task 4: Validate model
│   │   └── Task 5: Deploy to KServe if R² ≥ 0.78
│   ├── Test pipeline end-to-end
│   └── Debug any failures
├── Day 48-52: CI/CD integration
│   ├── GitHub webhook → Tekton PipelineRun
│   ├── Automatic triggering on new soil samples
│   ├── Slack notifications on pipeline status
│   └── Store pipeline artifacts in S3
└── Day 53-56: Experiment tracking
    ├── Integrate MLflow (or use built-in tracking)
    ├── Log all hyperparameters, metrics, artifacts
    ├── Create comparison dashboard (Grafana)
    └── Export reports for stakeholders

Week 9-10: Production Validation (Days 57-70)
├── Day 57-60: End-to-end testing
│   ├── Simulate production workflow:
│   │   User uploads field → API calls KServe → returns soil map
│   ├── Test with 100 real fields from SoilViews DB
│   ├── Verify predictions match AWS Lambda baseline (±5%)
│   └── Performance benchmarks (latency, throughput)
├── Day 61-65: Monitoring & alerting
│   ├── Prometheus metrics for KServe
│   ├── Grafana dashboards (request rate, latency, errors)
│   ├── Alertmanager rules (e.g., error rate > 5%)
│   └── PagerDuty/Slack integration
├── Day 66-68: Cost analysis
│   ├── Calculate actual costs during trial
│   ├── Project annual costs at scale
│   ├── Compare with AWS SageMaker/Lambda
│   └── ROI calculation
└── Day 69-70: Documentation
    ├── Architecture diagrams
    ├── Runbooks (deploy, rollback, troubleshoot)
    ├── Onboarding guide for new team members
    └── Lessons learned document

Week 11-12: Optimization & Decision (Days 71-84)
├── Day 71-75: Performance optimization
│   ├── Profile training bottlenecks (data loading, GPU utilization)
│   ├── Optimize data pipeline (pre-caching, parallel loading)
│   ├── Test Intel Gaudi accelerators (if available)
│   └── Target: <4 hours for full training run
├── Day 76-78: Security & compliance
│   ├── RBAC configuration (who can deploy models)
│   ├── Network policies (isolate training from serving)
│   ├── Image scanning for vulnerabilities
│   └── GDPR compliance check (EU data residency)
├── Day 79-81: Disaster recovery
│   ├── Backup strategies (S3 cross-region replication)
│   ├── Model rollback procedures
│   ├── Cluster failure scenarios tested
│   └── RTO/RPO documented
└── Day 82-84: Final evaluation
    ├── Cost: OpenShift AI vs. AWS vs. Watson X
    ├── Performance: Training speed, inference latency
    ├── Developer experience: Ease of use, tooling
    ├── Business value: ROI, risk reduction
    └── Go/No-Go decision

Week 13: Decision & Migration (Days 85-90)
├── Day 85-87: Stakeholder presentations
│   ├── Technical review (engineering team)
│   ├── Business case (management)
│   ├── Cost-benefit analysis (finance)
│   └── Risk assessment (security, compliance)
├── Day 88-89: Decision
│   ├── Option A: Continue with OpenShift AI (purchase license)
│   ├── Option B: Migrate back to AWS SageMaker
│   ├── Option C: Hybrid (training on OpenShift, serving on Lambda)
│   └── Document rationale
└── Day 90: Migration plan
    ├── If continuing: Negotiate pricing, set up production cluster
    ├── If migrating away: Export models, data, shut down trial
    └── Lessons learned shared with team
```

---

## Data Migration Strategy

### Phase 1: Data Inventory (Days 1-3)

**Current Data Assets**:

```
SoilViews Training Data (as of 2025-01-18)
├── Ground-Truth Samples: 18,340 samples
│   ├── Format: Parquet (samples.parquet)
│   ├── Size: ~50 MB
│   ├── Columns: sample_id, lat, lon, date, pH, om_pct, n, p, k, clay_pct, sand_pct, municipality
│   └── Location: PostgreSQL database (primary) + S3 backup
├── Sentinel-2 Imagery
│   ├── Format: Cloud-Optimized GeoTIFF (COG)
│   ├── Size: ~500 GB (2017-2025, bare-soil composites)
│   ├── Bands: B2, B3, B4, B5, B6, B7, B8, B11 (8 bands)
│   ├── Resolution: 10m
│   └── Location: AWS S3 (soilviews-cogs bucket)
└── Sentinel-1 SAR (optional)
    ├── Format: GeoTIFF
    ├── Size: ~200 GB
    ├── Bands: VV, VH polarization
    └── Location: AWS S3
```

### Phase 2: Storage Selection (Days 4-5)

**Option A: Use Existing AWS S3 (Recommended for Trial)**

```yaml
# OpenShift AI can access AWS S3 directly
apiVersion: v1
kind: Secret
metadata:
  name: aws-s3-credentials
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "AKIA..."
  AWS_SECRET_ACCESS_KEY: "..."
  AWS_DEFAULT_REGION: "eu-central-1"
```

**Pros**:
- ✅ No data migration needed (use existing S3 buckets)
- ✅ Faster trial setup (no upload time)
- ✅ Hybrid architecture (OpenShift training + AWS inference)

**Cons**:
- ❌ Egress costs from AWS S3 to OpenShift AI
- ❌ Latency if OpenShift cluster in different region

**Option B: Migrate to MinIO (S3-compatible on OpenShift)**

```bash
# Install MinIO operator on OpenShift
oc apply -f https://raw.githubusercontent.com/minio/operator/master/k8s/operator.yaml

# Create MinIO tenant
oc apply -f - <<EOF
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: soilviews-minio
spec:
  pools:
    - servers: 4
      volumesPerServer: 4
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 1Ti  # 4 servers × 4 volumes × 1 TB = 16 TB total
  requestAutoCert: false
EOF
```

**Pros**:
- ✅ No egress costs (data local to cluster)
- ✅ Faster data access (low latency)
- ✅ Full control over data

**Cons**:
- ❌ Need to upload 700 GB data (takes 6-12 hours)
- ❌ Additional storage costs on OpenShift

**Decision for 90-Day Trial**: **Option A** (use existing AWS S3)
**Reason**: Minimize setup time, evaluate performance first

### Phase 3: Data Access Patterns (Days 6-10)

#### Access from JupyterLab

```python
# notebooks/data_access_test.ipynb
import boto3
import rasterio
from rasterio.session import AWSSession
import pandas as pd

# Configure AWS credentials from OpenShift Secret
s3_client = boto3.client('s3',
    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    region_name='eu-central-1'
)

# Load ground-truth samples
samples_df = pd.read_parquet('s3://soilviews-data/ground_truth/samples.parquet')
print(f"Loaded {len(samples_df)} soil samples")

# Load Sentinel-2 COG
aws_session = AWSSession(boto3.Session())
with rasterio.Env(aws_session):
    with rasterio.open('s3://soilviews-cogs/sentinel2-2024-04-15-bulgaria.tif') as src:
        print(f"Sentinel-2 bands: {src.count}")
        print(f"Resolution: {src.res}")
        # Read sample patch
        window = rasterio.windows.Window(0, 0, 256, 256)
        data = src.read(window=window)  # Shape: (8, 256, 256)
        print(f"Sample data shape: {data.shape}")
```

#### Access from Ray Workers

```python
# Ray workers need AWS credentials injected via env vars
import ray
from ray.data import read_parquet

# Initialize Ray cluster (configured by CodeFlare)
ray.init(address='ray://ray-cluster-head:10001')

# Load data with Ray Data API (distributed)
samples_dataset = ray.data.read_parquet('s3://soilviews-data/ground_truth/samples.parquet')
print(f"Dataset size: {samples_dataset.count()} samples")

# Repartition for parallel processing
samples_dataset = samples_dataset.repartition(num_blocks=16)  # 16 partitions for 4 GPUs
```

### Phase 4: Data Preprocessing Pipeline (Days 11-14)

**Goal**: Extract Sentinel-2 pixels for each soil sample (sample-to-pixel mapping)

```python
# scripts/preprocess_openshift.py
import ray
import pandas as pd
import rasterio
from shapely.geometry import Point, box

@ray.remote
def extract_pixel_batch(sample_batch, sentinel2_paths):
    """
    Extract Sentinel-2 pixel values for a batch of soil samples.
    Runs in parallel on Ray workers.
    """
    results = []
    for _, sample in sample_batch.iterrows():
        # Find matching Sentinel-2 image by date
        sentinel2_path = find_matching_image(sample['sample_date'], sentinel2_paths)

        # Extract pixel at (lat, lon)
        pixel_values = extract_pixel_for_sample(
            sample['latitude'],
            sample['longitude'],
            sentinel2_path
        )

        # Combine sample metadata + pixel features
        results.append({
            'sample_id': sample['sample_id'],
            'features': pixel_values,  # 8-band spectral signature
            'targets': {
                'ph': sample['ph'],
                'om_pct': sample['om_pct'],
                'n_mg_kg': sample['n_mg_kg'],
                'p_mg_kg': sample['p_mg_kg'],
                'k_mg_kg': sample['k_mg_kg'],
                'clay_pct': sample['clay_pct'],
                'sand_pct': sample['sand_pct']
            }
        })
    return results

# Initialize Ray cluster
ray.init(address='ray://ray-cluster-head:10001')

# Load samples
samples_df = pd.read_parquet('s3://soilviews-data/ground_truth/samples.parquet')

# Get list of Sentinel-2 images
sentinel2_paths = s3_client.list_objects_v2(
    Bucket='soilviews-cogs',
    Prefix='sentinel2/'
)['Contents']

# Split samples into batches for parallel processing
batch_size = 500
sample_batches = [samples_df[i:i+batch_size] for i in range(0, len(samples_df), batch_size)]

# Distribute across Ray workers
futures = [
    extract_pixel_batch.remote(batch, sentinel2_paths)
    for batch in sample_batches
]

# Collect results
all_results = ray.get(futures)
training_data = [item for batch in all_results for item in batch]

# Save preprocessed dataset
preprocessed_df = pd.DataFrame(training_data)
preprocessed_df.to_parquet('s3://soilviews-data/processed/training_dataset.parquet')
print(f"Preprocessed {len(preprocessed_df)} samples")
```

**Performance**:
- Single-threaded: ~6 hours for 18,340 samples
- Ray distributed (4 workers): ~1.5 hours ✅

---

## Training Pipeline Design

### PyTorch Lightning + Ray Integration

**Current Training Code** (single GPU):

```python
# packages/ml-pipeline/train.py (existing)
import pytorch_lightning as pl
from pytorch_lightning import Trainer

model = SoilPredictionModule(learning_rate=1e-4)

trainer = Trainer(
    max_epochs=100,
    accelerator='gpu',
    devices=1,  # Single GPU
    precision='16-mixed',
    callbacks=[checkpoint_callback, early_stop_callback],
    logger=wandb_logger
)

trainer.fit(model, train_dataloader, val_dataloader)
```

**Modified for OpenShift AI + Ray** (multi-GPU):

```python
# packages/ml-pipeline/train_ray.py (new)
import pytorch_lightning as pl
from pytorch_lightning import Trainer
from pytorch_lightning.strategies import DDPStrategy
from ray_lightning import RayStrategy
from codeflare_sdk.cluster import Cluster, ClusterConfiguration
import ray

# Step 1: Create Ray cluster with CodeFlare
cluster_config = ClusterConfiguration(
    name='soilviews-training',
    namespace='soilviews',
    num_workers=4,  # 4 GPU workers
    min_cpus=2,
    max_cpus=8,
    min_memory=16,  # 16 GB RAM per worker
    max_memory=32,
    num_gpus=1,  # 1 GPU per worker
    image='quay.io/project-codeflare/ray:2.7.0-py39-cu118',  # Ray 2.7 + CUDA 11.8
    instascale=True  # Auto-scale cluster
)

cluster = Cluster(cluster_config)
cluster.up()
cluster.wait_ready()

# Step 2: Connect to Ray cluster
ray.init(address=cluster.local_client_url())

# Step 3: Initialize PyTorch Lightning model
model = SoilPredictionModule(learning_rate=1e-4)

# Step 4: Configure Ray strategy for distributed training
trainer = Trainer(
    max_epochs=100,
    accelerator='gpu',
    devices=4,  # 4 GPUs
    num_nodes=1,  # Single Ray cluster (multi-GPU on same cluster)
    strategy=RayStrategy(
        num_workers=4,  # Match num GPUs
        use_gpu=True,
        find_unused_parameters=False  # Optimization
    ),
    precision='16-mixed',  # Automatic Mixed Precision
    callbacks=[checkpoint_callback, early_stop_callback],
    logger=wandb_logger,
    sync_batchnorm=True  # Sync batch norm across GPUs
)

# Step 5: Train
trainer.fit(model, train_dataloader, val_dataloader)

# Step 6: Tear down Ray cluster
cluster.down()
```

### Data Loading for Distributed Training

**Challenge**: Each GPU worker needs access to different data batches

**Solution**: Ray Data API for distributed data loading

```python
# packages/ml-pipeline/dataloader_ray.py
import ray
from ray.data import read_parquet
from torch.utils.data import IterableDataset
import torch

class RayDistributedDataset(IterableDataset):
    """
    PyTorch IterableDataset backed by Ray Data.
    Each worker gets a different shard of the data.
    """
    def __init__(self, ray_dataset, rank, world_size):
        self.ray_dataset = ray_dataset
        self.rank = rank  # GPU rank (0, 1, 2, 3)
        self.world_size = world_size  # Total GPUs (4)

        # Shard dataset for this worker
        self.shard = ray_dataset.split(world_size)[rank]

    def __iter__(self):
        for batch in self.shard.iter_batches(batch_size=4):
            # Convert Ray batch to PyTorch tensors
            features = torch.tensor(batch['features'])  # Shape: (4, 8, 256, 256)
            targets = torch.tensor(batch['targets'])    # Shape: (4, 7, 256, 256)

            for i in range(len(features)):
                yield features[i], targets[i]

# Usage in training script
ray_dataset = ray.data.read_parquet('s3://soilviews-data/processed/training_dataset.parquet')

# Each GPU gets its own DataLoader
train_dataset = RayDistributedDataset(
    ray_dataset,
    rank=trainer.global_rank,
    world_size=trainer.world_size
)

train_dataloader = torch.utils.data.DataLoader(
    train_dataset,
    batch_size=None,  # Batching handled by Ray Data
    num_workers=0  # No need for multiprocessing (Ray handles it)
)
```

### Checkpointing to S3

```python
# Automatic checkpointing to S3 during training
from pytorch_lightning.callbacks import ModelCheckpoint

checkpoint_callback = ModelCheckpoint(
    dirpath='s3://soilviews-models/checkpoints/',
    filename='soilviews-{epoch:02d}-{val_r2:.3f}',
    monitor='val_r2',
    mode='max',
    save_top_k=3,
    save_last=True
)
```

### Expected Performance Gains

| Configuration | Training Time | Cost (€3/hr GPU) | Speedup |
|---------------|---------------|------------------|---------|
| 1× V100 GPU | 16 hours | €48 | 1.0x |
| 2× V100 GPU (Ray) | 9 hours | €54 | **1.78x** |
| 4× V100 GPU (Ray) | 5 hours | €60 | **3.2x** |

**Recommendation**: Start with 2 GPUs during trial, scale to 4 GPUs for production

---

## Distributed Training with Ray

### Ray + CodeFlare Architecture

```
┌───────────────────────────────────────────────────────────────┐
│ Ray Cluster (Managed by KubeRay Operator)                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Head Node (CPU-only)                                         │
│  ├── Ray GCS (Global Control Service)                        │
│  ├── Ray Dashboard (monitoring)                              │
│  └── Cluster orchestration                                   │
│                                                               │
│  Worker Node 1 (GPU)                                          │
│  ├── NVIDIA V100 GPU (16 GB VRAM)                            │
│  ├── Ray worker process                                      │
│  ├── PyTorch training (DDP rank 0)                           │
│  └── Model shard 1/4                                         │
│                                                               │
│  Worker Node 2 (GPU)                                          │
│  ├── NVIDIA V100 GPU                                         │
│  └── PyTorch training (DDP rank 1)                           │
│                                                               │
│  Worker Node 3 (GPU)                                          │
│  ├── NVIDIA V100 GPU                                         │
│  └── PyTorch training (DDP rank 2)                           │
│                                                               │
│  Worker Node 4 (GPU)                                          │
│  ├── NVIDIA V100 GPU                                         │
│  └── PyTorch training (DDP rank 3)                           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### CodeFlare SDK Usage

**Step 1: Install CodeFlare SDK in Jupyter**

```bash
pip install codeflare-sdk
```

**Step 2: Create Ray Cluster**

```python
# notebooks/create_ray_cluster.ipynb
from codeflare_sdk.cluster import Cluster, ClusterConfiguration

# Define cluster configuration
config = ClusterConfiguration(
    name='soilviews-training-cluster',
    namespace='soilviews',  # Your OpenShift project
    num_workers=4,  # 4 GPU workers
    min_cpus=4,
    max_cpus=8,
    min_memory=16,  # GB
    max_memory=32,
    num_gpus=1,  # 1 GPU per worker
    image='quay.io/modh/ray:2.7.0-py39-cu118',  # Pre-built image with PyTorch
    instascale=True,  # Auto-scaling
    machine_types=['g4dn.2xlarge'],  # AWS instance type (if using ROSA)
    labels={'app': 'soilviews', 'workload': 'training'}
)

# Create and start cluster
cluster = Cluster(config)
cluster.up()

# Wait for cluster to be ready
cluster.wait_ready()

# Print connection info
print(f"Ray Dashboard: {cluster.cluster_dashboard_uri()}")
print(f"Ray Client URL: {cluster.local_client_url()}")
```

**Step 3: Submit Training Job to Ray**

```python
import ray
from ray.util.joblib import register_ray

# Connect to Ray cluster
ray.init(address=cluster.local_client_url())

# Submit training job
job_id = ray.job_submission.submit_job(
    entrypoint="python train_ray.py --config configs/efficientnet-b3.yaml",
    runtime_env={
        "working_dir": "./packages/ml-pipeline",
        "pip": ["pytorch-lightning==2.1.0", "segmentation-models-pytorch"]
    }
)

# Monitor job progress
ray.job_submission.get_job_logs(job_id)
```

**Step 4: Monitor with Ray Dashboard**

Access at: `http://<cluster-dashboard-uri>`

Metrics:
- CPU/GPU utilization per worker
- Task execution timeline
- Object store memory usage
- Logs from each worker

### Resource Quotas with Kueue

**Problem**: Prevent resource overuse during trial

**Solution**: Kueue for quota management

```yaml
# kueue_quota.yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: ResourceFlavor
metadata:
  name: gpu-flavor
spec:
  nodeLabels:
    nvidia.com/gpu: "true"
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: ClusterQueue
metadata:
  name: soilviews-gpu-queue
spec:
  namespaceSelector: {}
  resourceGroups:
    - coveredResources: ["cpu", "memory", "nvidia.com/gpu"]
      flavors:
        - name: gpu-flavor
          resources:
            - name: "cpu"
              nominalQuota: 32  # Max 32 CPUs
            - name: "memory"
              nominalQuota: 128Gi  # Max 128 GB RAM
            - name: "nvidia.com/gpu"
              nominalQuota: 4  # Max 4 GPUs
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: LocalQueue
metadata:
  name: soilviews-training-queue
  namespace: soilviews
spec:
  clusterQueue: soilviews-gpu-queue
```

Apply quotas:
```bash
oc apply -f kueue_quota.yaml
```

---

## Model Serving with KServe

### KServe Deployment Options

#### Option 1: Serverless Mode (Recommended)

**Use Case**: Variable inference load, auto-scaling needed

```yaml
# kserve_soilviews.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: soilviews-model
  namespace: soilviews
spec:
  predictor:
    pytorch:
      storageUri: s3://soilviews-models/production/model.pt
      resources:
        requests:
          cpu: 2
          memory: 4Gi
        limits:
          cpu: 4
          memory: 8Gi
      env:
        - name: PROTOCOL_VERSION
          value: v2
    minReplicas: 0  # Scale to zero when idle
    maxReplicas: 5  # Scale up to 5 replicas under load
    scaleTarget: 10  # Target 10 concurrent requests per replica
    scaleMetric: concurrency
```

Deploy:
```bash
oc apply -f kserve_soilviews.yaml
```

**Inference Request**:
```bash
curl -X POST http://soilviews-model.soilviews.svc.cluster.local/v2/models/soilviews-model/infer \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [{
      "name": "sentinel2_image",
      "shape": [1, 10, 256, 256],
      "datatype": "FP32",
      "data": [...]  # Sentinel-2 pixel values
    }]
  }'
```

#### Option 2: RawDeployment Mode

**Use Case**: Edge deployments, lower overhead

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: soilviews-model-raw
  annotations:
    serving.kserve.io/deploymentMode: RawDeployment
spec:
  predictor:
    pytorch:
      storageUri: s3://soilviews-models/production/model.pt
      resources:
        requests:
          cpu: 2
          memory: 4Gi
```

**Difference**: No service mesh (Istio/Knative), direct Kubernetes deployment

### Canary Deployments

**Scenario**: Test new model version with 10% traffic before full rollout

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: soilviews-model
spec:
  predictor:
    pytorch:
      storageUri: s3://soilviews-models/production/model-v1.1.pt
    canaryTrafficPercent: 10  # 10% traffic to new model
  canary:
    pytorch:
      storageUri: s3://soilviews-models/production/model-v1.2.pt
```

**Monitoring**:
- Compare accuracy, latency between v1.1 and v1.2
- If v1.2 performs well: increase canaryTrafficPercent to 100%
- If issues: rollback by setting canaryTrafficPercent to 0

### Hybrid Deployment (OpenShift + AWS Lambda)

**Strategy**: Train on OpenShift AI, serve on both KServe and Lambda

```
Training (OpenShift AI)
  ↓
Export TorchScript model
  ↓
┌─────────────────┬─────────────────┐
│                 │                 │
│  KServe (K8s)   │  AWS Lambda     │
│  (EU traffic)   │  (Global traffic)│
│                 │                 │
└─────────────────┴─────────────────┘
```

**Rationale**:
- KServe for EU customers (GDPR compliance, low latency)
- Lambda for global customers (existing infrastructure, CDN)

---

## MLOps Workflow

### Automated Pipeline with Tekton

**Goal**: Trigger training on new soil samples, deploy if model improves

```yaml
# tekton_pipeline.yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: soilviews-training-pipeline
spec:
  params:
    - name: git-revision
      type: string
      default: main
    - name: model-version
      type: string
  tasks:
    - name: fetch-new-samples
      taskRef:
        name: fetch-soil-samples
      params:
        - name: database-url
          value: $(params.database-url)

    - name: preprocess-data
      runAfter: [fetch-new-samples]
      taskRef:
        name: ray-preprocess
      params:
        - name: input-path
          value: $(tasks.fetch-new-samples.results.output-path)

    - name: train-model
      runAfter: [preprocess-data]
      taskRef:
        name: ray-train-pytorch
      params:
        - name: data-path
          value: $(tasks.preprocess-data.results.output-path)
        - name: num-gpus
          value: "4"
        - name: max-epochs
          value: "100"

    - name: validate-model
      runAfter: [train-model]
      taskRef:
        name: validate-r2-score
      params:
        - name: model-path
          value: $(tasks.train-model.results.checkpoint-path)
        - name: min-r2
          value: "0.78"

    - name: register-model
      runAfter: [validate-model]
      when:
        - input: $(tasks.validate-model.results.r2-score)
          operator: gt
          values: ["0.78"]
      taskRef:
        name: register-to-mlflow
      params:
        - name: model-path
          value: $(tasks.train-model.results.checkpoint-path)
        - name: model-version
          value: $(params.model-version)

    - name: deploy-to-kserve
      runAfter: [register-model]
      taskRef:
        name: deploy-kserve-canary
      params:
        - name: model-uri
          value: $(tasks.register-model.results.model-uri)
        - name: canary-percent
          value: "10"
```

### Tekton Task Examples

**Task 1: Fetch New Soil Samples**

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: fetch-soil-samples
spec:
  params:
    - name: database-url
      type: string
  results:
    - name: output-path
  steps:
    - name: fetch
      image: postgres:15
      script: |
        #!/bin/bash
        psql $(params.database-url) -c "COPY (
          SELECT * FROM soil_samples
          WHERE created_at > NOW() - INTERVAL '7 days'
        ) TO STDOUT WITH CSV HEADER" > /workspace/new_samples.csv

        echo "s3://soilviews-data/incremental/$(date +%Y%m%d).csv" | tee $(results.output-path.path)
```

**Task 2: Train with Ray**

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: ray-train-pytorch
spec:
  params:
    - name: data-path
    - name: num-gpus
    - name: max-epochs
  results:
    - name: checkpoint-path
  steps:
    - name: train
      image: quay.io/soilviews/ml-pipeline:latest
      script: |
        #!/usr/bin/env python
        from codeflare_sdk.cluster import Cluster, ClusterConfiguration
        import ray

        # Create Ray cluster
        config = ClusterConfiguration(
          name='tekton-training',
          num_workers=$(params.num-gpus),
          num_gpus=1
        )
        cluster = Cluster(config)
        cluster.up()
        cluster.wait_ready()

        # Run training
        ray.init(address=cluster.local_client_url())
        from ml_pipeline.train_ray import train_model
        checkpoint = train_model(
          data_path='$(params.data-path)',
          max_epochs=$(params.max-epochs)
        )

        # Save checkpoint path
        with open('$(results.checkpoint-path.path)', 'w') as f:
          f.write(checkpoint)

        cluster.down()
```

### Monitoring & Alerting

**Prometheus Metrics**:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kserve-soilviews
spec:
  selector:
    matchLabels:
      serving.kserve.io/inferenceservice: soilviews-model
  endpoints:
    - port: metrics
      interval: 30s
```

**Key Metrics**:
- `kserve_model_latency_ms{model="soilviews-model"}`: Inference latency
- `kserve_model_requests_total`: Request count
- `kserve_model_errors_total`: Error count

**Grafana Dashboard**:

```json
{
  "panels": [
    {
      "title": "Inference Latency (p95)",
      "targets": [{
        "expr": "histogram_quantile(0.95, rate(kserve_model_latency_ms_bucket[5m]))"
      }]
    },
    {
      "title": "Request Rate",
      "targets": [{
        "expr": "rate(kserve_model_requests_total[1m])"
      }]
    },
    {
      "title": "Error Rate",
      "targets": [{
        "expr": "rate(kserve_model_errors_total[1m]) / rate(kserve_model_requests_total[1m])"
      }]
    }
  ]
}
```

---

## Cost Analysis

### OpenShift AI Pricing Models

**Option 1: Self-Managed (ROSA - Red Hat OpenShift on AWS)**

| Component | Instance Type | Hourly Rate | Monthly (730 hrs) |
|-----------|---------------|-------------|-------------------|
| Control Plane | m5.2xlarge (3 nodes) | €0.384 | €280 |
| Worker (CPU) | m5.4xlarge (2 nodes) | €0.768 | €560 |
| Worker (GPU) | g4dn.2xlarge (2 nodes) | €0.752 | €550 |
| **Total** | | **€1.90/hr** | **€1,390/month** |

**Option 2: Managed Service (OpenShift Dedicated)**

| Tier | Price | Includes |
|------|-------|----------|
| Starter | €2,500/month | 4 worker nodes (CPU), support |
| Standard | €5,000/month | 8 worker nodes, GPU quota, premium support |
| Enterprise | Custom | Unlimited, SLA, dedicated TAM |

**Option 3: Trial (90 Days)**

- **Cost**: **€0** (free trial, but AWS infrastructure costs apply)
- **AWS Infrastructure** (if using ROSA):
  - EC2 instances: ~€1,200/month
  - EBS storage: ~€100/month
  - Data transfer: ~€50/month
  - **Total**: ~€1,350/month × 3 months = **€4,050**

### Cost Comparison (Training)

**Scenario**: Train EfficientNet-b3 on 18,340 samples, 100 epochs

| Platform | Instance Type | GPUs | Training Time | Cost/Run | Monthly (4 runs) |
|----------|---------------|------|---------------|----------|------------------|
| **Local GPU** | RTX 4090 | 1 | 16 hrs | €0 (CapEx) | €0 |
| **AWS SageMaker** | ml.p3.2xlarge | 1 V100 | 16 hrs | €56 | €224 |
| **AWS SageMaker Spot** | ml.p3.2xlarge | 1 V100 | 16 hrs | €17 (70% off) | €68 |
| **OpenShift AI** | g4dn.2xlarge | 1 T4 | 18 hrs | €14 | €56 |
| **OpenShift AI (multi-GPU)** | 4× g4dn.2xlarge | 4 T4 | 5 hrs | €15 | €60 |
| **IBM Watson X** | V100 GPU | 1 V100 | 16 hrs | €80 | €320 |

**Key Insight**: OpenShift AI with multi-GPU is **3x faster** and **only 7% more expensive** than single-GPU SageMaker Spot

### Cost Comparison (Inference)

**Scenario**: 1,000 field analyses per month (avg 20 ha each)

| Platform | Pricing Model | Cost/Inference | Monthly Cost |
|----------|---------------|----------------|--------------|
| **AWS Lambda** | $0.0000166667/GB-sec + requests | €0.02 | €20 |
| **KServe (scale-to-zero)** | €0.01/pod-hour (avg 2 hrs/day) | €0.001 | €1 |
| **KServe (always-on)** | 1 pod × 730 hrs × €0.05/hr | €0.037 | €37 |

**Key Insight**: KServe with scale-to-zero is **20x cheaper** than AWS Lambda for low-volume workloads

### Total Cost of Ownership (TCO) - Annual

**Scenario**: 4 training runs/month + 1,000 inferences/month

| Component | AWS (Current) | OpenShift AI (Proposed) | Savings |
|-----------|---------------|------------------------|---------|
| **Training** | €224/mo | €60/mo | **-73%** |
| **Inference** | €20/mo | €1/mo | **-95%** |
| **Infrastructure** | €0 (pay-as-you-go) | €1,390/mo (ROSA) | -€1,390/mo |
| **Total Annual** | **€2,928** | **€17,412** | **-€14,484** |

**Conclusion**: For SoilViews' current scale, **AWS is more cost-effective**

**However**, OpenShift AI becomes competitive when:
- Training frequency increases (>10 runs/month)
- Multi-model deployment (serving multiple crop types, not just soil)
- Need for EU data residency (GDPR compliance)
- Enterprise features (governance, audit logs, RBAC)

### Break-Even Analysis

**Question**: At what scale does OpenShift AI become cheaper?

```
AWS Cost = Training (€224/mo) + Inference (€20/mo) = €244/mo base
OpenShift Cost = €1,390/mo fixed + marginal costs

Break-even when:
€244/mo + (N × €56/training) = €1,390/mo + (N × €15/training)

Solving for N:
€244 + €56N = €1,390 + €15N
€41N = €1,146
N = 28 training runs/month
```

**Answer**: OpenShift AI becomes cost-effective at **>28 training runs/month** (nearly daily retraining)

**Recommendation for 90-Day Trial**:
- Evaluate **performance and features** (not just cost)
- If training frequency increases in future → OpenShift AI
- If current scale continues → stick with AWS SageMaker Spot + Lambda

---

## Risk Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Learning curve too steep** | High | Medium | Allocate 2 weeks for team training, use Red Hat documentation |
| **GPU quota unavailable** | Medium | High | Request GPU quota on Day 1, have AWS SageMaker as backup |
| **Ray cluster instability** | Medium | Medium | Use battle-tested Ray 2.7+, enable auto-recovery |
| **Data egress costs from AWS S3** | Low | Medium | Monitor costs, consider MinIO migration if >€500/mo |
| **KServe performance issues** | Low | High | Load test early (Week 5), have Lambda as fallback |
| **Trial expiration before decision** | Medium | Medium | Set reminder on Day 75, start migration planning |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Higher costs than AWS** | High | Medium | Calculate TCO on Day 80, have exit plan |
| **Vendor lock-in to Red Hat** | Medium | Low | Use standard Kubernetes APIs, avoid vendor-specific features |
| **Team prefers AWS ecosystem** | Medium | Low | Gather feedback weekly, prioritize developer experience |
| **No clear ROI** | Medium | High | Define success metrics upfront (speed, cost, features) |

### Contingency Plans

**If GPU quota denied**:
- Use CPU-only training (slower but functional)
- Request quota increase (escalate to Red Hat support)
- Fallback to AWS SageMaker for 90-day trial

**If costs exceed €5,000/month**:
- Downscale to 2 GPUs instead of 4
- Use spot instances (if available on OpenShift)
- Migrate back to AWS after trial

**If KServe doesn't meet latency requirements** (<5s for 20ha field):
- Use RawDeployment mode (lower overhead)
- Optimize model (TorchScript compilation, quantization)
- Keep AWS Lambda as primary inference (hybrid approach)

**If team struggles with complexity**:
- Hire Red Hat consultant (included in Enterprise support)
- Simplify architecture (skip Tekton pipelines, use manual workflows)
- Extend trial period (negotiate with Red Hat)

---

## Next Steps

### Pre-Trial Checklist (Before Day 1)

- [ ] Sign up for Red Hat Developer account
- [ ] Request 90-day OpenShift AI trial
- [ ] Request GPU quota (2-4× V100 or T4 GPUs)
- [ ] Provision OpenShift cluster (ROSA or Dedicated)
- [ ] Grant team access to cluster (RBAC setup)
- [ ] Configure AWS S3 credentials (for data access)
- [ ] Clone SoilViews repository to OpenShift Git
- [ ] Schedule kickoff meeting (team alignment)

### Success Criteria (Day 90 Evaluation)

**Must-Have**:
- ✅ Successfully train model with R² ≥ 0.78
- ✅ Deploy model to KServe (inference latency <10s for 20ha)
- ✅ Cost analysis complete (TCO vs AWS)
- ✅ Team trained (can operate independently)

**Nice-to-Have**:
- ✅ Distributed training working (2-4 GPUs)
- ✅ Automated pipeline (Tekton) functional
- ✅ Monitoring dashboards (Grafana)
- ✅ Documentation complete

**Decision Matrix**:

| Outcome | Decision |
|---------|----------|
| All Must-Haves + 3+ Nice-to-Haves | **Continue with OpenShift AI** (purchase license) |
| All Must-Haves + 1-2 Nice-to-Haves | **Hybrid approach** (train on OpenShift, serve on Lambda) |
| Missing Must-Haves | **Migrate back to AWS** SageMaker/Lambda |

---

## Appendix: Useful Resources

### Red Hat Documentation
- [OpenShift AI Documentation](https://docs.redhat.com/en/documentation/red_hat_openshift_ai/2025)
- [Distributed Workloads Guide](https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/2.22/html/working_with_distributed_workloads)
- [KServe Model Serving](https://kserve.github.io/website/)

### Code Examples
- [Ray + PyTorch Lightning](https://docs.ray.io/en/latest/train/getting-started-pytorch-lightning.html)
- [CodeFlare SDK Examples](https://github.com/project-codeflare/codeflare-sdk/tree/main/demo-notebooks)
- [KServe PyTorch Example](https://kserve.github.io/website/latest/modelserving/v1beta1/pytorch/)

### Community
- Red Hat OpenShift AI Slack: [#openshift-ai](https://redhat.enterprise.slack.com)
- Ray Community: [discuss.ray.io](https://discuss.ray.io/)
- KServe Slack: [#kserve](https://kubeflow.slack.com)

---

**Document Owner**: SoilViews ML Team
**Review Schedule**: Weekly during trial (Days 7, 14, 21, ..., 84)
**Feedback**: Submit issues to `soilviews/openshift-ai-trial` GitHub repo
