# ADR-006: AWS Lambda (ARM) for Serverless ML Inference

## Status

Accepted

## Context

SoilViews needs to run deep learning inference on Sentinel-2 imagery to predict soil
properties. Inference workload characteristics:

- **Sporadic**: Farmers request maps on-demand (not continuous stream)
- **Variable**: 1-100 requests/hour (seasonal spikes during planting)
- **CPU-Bound**: EfficientNet-b3 model runs on CPU (GPU too expensive for inference)
- **Large Model**: 48 MB TorchScript file
- **Input Size**: 256×256×10 (10 bands) → ~2.6 MB per field image

### Requirements

- **Latency**: < 30 s per field (20 ha typical)
- **Concurrency**: Handle 50 simultaneous requests during peak
- **Cost**: < €0.03/ha (target: €0.025/ha)
- **Scalability**: Auto-scale from 0 to 100 concurrent executions
- **Cold Start**: < 10 s

### Options Considered

1. **Always-On EC2 Instance** (t3.medium with model loaded)
2. **ECS Fargate** (containerized, auto-scaling)
3. **AWS Lambda** (serverless functions)
4. **SageMaker Inference Endpoints** (managed ML serving)
5. **Kubernetes Pods** (EKS with HPA)

## Decision

We will use **AWS Lambda with ARM (Graviton2) processors** for ML inference.

**Configuration**:

- Runtime: Python 3.11 (arm64)
- Memory: 10,240 MB (10 GB)
- Timeout: 300 s (5 minutes)
- Ephemeral Storage: 512 MB
- EFS Mount: `/mnt/models` (model cache)

## Rationale

### Cost Comparison (10,000 inferences/month)

| Solution                | Instance Type | Monthly Cost | Cost/Inference | Pros/Cons                   |
| ----------------------- | ------------- | ------------ | -------------- | --------------------------- |
| EC2 (always-on)         | t3.medium     | €35          | €0.0035        | Simple, but wasteful        |
| ECS Fargate             | 2 vCPU, 4 GB  | €25          | €0.0025        | Good, but more complex      |
| **Lambda (x86)**        | 10 GB         | **€18**      | **€0.0018**    | **Cheapest, auto-scales**   |
| **Lambda (ARM)**        | 10 GB         | **€14**      | **€0.0014**    | **20% cheaper than x86**    |
| SageMaker Endpoint      | ml.t3.medium  | €45          | €0.0045        | Expensive, overkill         |
| EKS (3 pods)            | t3.small × 3  | €50          | €0.0050        | Complex, high baseline cost |

**Winner**: **Lambda (ARM)** is **60% cheaper** than EC2 and scales to zero when idle.

### Why ARM (Graviton2)?

AWS Lambda supports ARM (Graviton2) as of 2021. PyTorch has native ARM support.

**Benefits**:

- **20% Cost Savings**: ARM pricing is 20% lower than x86
- **Performance**: PyTorch 2.x optimized for ARM (comparable speed to x86)
- **Energy Efficient**: Graviton2 is 60% more energy-efficient

**Compatibility**:

- ✅ PyTorch 2.1 (official ARM wheels)
- ✅ ONNX Runtime (native ARM builds)
- ✅ NumPy, SciPy, rasterio (ARM compatible via conda-forge)

### Lambda Configuration Details

**Memory = 10,240 MB (10 GB)**:

- Model size: 48 MB (TorchScript)
- PyTorch runtime: ~500 MB
- Input image: 2.6 MB
- Working memory: 200 MB
- Buffer: ~9.5 GB available (comfortable margin)

**Why 10 GB?** Higher memory = more vCPUs allocated (6 vCPUs at 10 GB vs. 1 vCPU at 1 GB).
**Inference is CPU-bound**, so more vCPUs = faster.

**Timeout = 300 s**:

- Typical inference: 15-20 s
- Worst case (large field): 60 s
- 5× safety margin

**EFS for Model Cache**:

- **Problem**: Lambda /tmp has 512 MB limit (model is 48 MB, but PyTorch + deps need more)
- **Solution**: Mount EFS at `/mnt/models` and cache model there
- **Benefit**: Warm starts load model from EFS (~2 s) instead of S3 (~8 s)

### Cold Start Optimization

**Cold Start Components**:

1. Lambda initialization: ~2 s
2. Python import (PyTorch, rasterio): ~5 s
3. Model load from EFS: ~2 s
4. **Total Cold Start**: ~9 s

**Warm Start** (< 1 s): Lambda reuses existing container if invoked within 15 minutes.

**Optimization Strategies**:

- **Provisioned Concurrency**: Keep 2 warm instances (€15/month) for instant response
- **Lazy Imports**: Import heavy libraries only when needed
- **TorchScript**: Pre-compiled model (faster load than PyTorch .pth)

## Implementation

### Lambda Function (Python)

```python
import json
import os
import torch
import rasterio
from rasterio.io import MemoryFile
import numpy as np
import boto3

# Global variables (persist across warm invocations)
s3_client = boto3.client('s3')
model = None

def load_model():
    """Load model from EFS cache."""
    global model
    if model is None:
        model_path = '/mnt/models/soilviews-efficientnet-b3.pt'
        if not os.path.exists(model_path):
            # Download from S3 to EFS (first time only)
            s3_client.download_file('soilviews-models', 'production/model.pt', model_path)
        model = torch.jit.load(model_path, map_location='cpu')
        model.eval()
    return model

def lambda_handler(event, context):
    """
    Predict soil properties from COG image.

    Event:
    {
        "cog_url": "s3://soilviews-cogs/sentinel2-field-123.tif",
        "field_id": "uuid",
        "bbox": [minx, miny, maxx, maxy]
    }
    """
    cog_url = event['cog_url']
    bbox = event.get('bbox')

    # Load model
    model = load_model()

    # Read COG from S3
    bucket, key = cog_url.replace('s3://', '').split('/', 1)
    obj = s3_client.get_object(Bucket=bucket, Key=key)

    with MemoryFile(obj['Body'].read()) as memfile:
        with memfile.open() as src:
            # Read all bands
            image = src.read()  # Shape: (10, H, W)

            # Normalize to [0, 1]
            image = image.astype(np.float32) / 10000.0

            # Convert to tensor
            image_tensor = torch.from_numpy(image).unsqueeze(0)  # (1, 10, H, W)

            # Inference
            with torch.no_grad():
                predictions = model(image_tensor)  # (1, 7, H, W)

            # Convert to numpy
            predictions_np = predictions.squeeze(0).numpy()  # (7, H, W)

            # Save predictions to S3 as GeoTIFF
            output_key = f"predictions/{event['field_id']}-soil-properties.tif"
            save_predictions_to_s3(predictions_np, src.profile, bucket, output_key)

    return {
        'statusCode': 200,
        'body': json.dumps({
            'prediction_url': f's3://{bucket}/{output_key}',
            'field_id': event['field_id']
        })
    }

def save_predictions_to_s3(predictions, profile, bucket, key):
    """Save predictions as GeoTIFF to S3."""
    profile.update(count=7, dtype='float32', compress='lzw')

    with MemoryFile() as memfile:
        with memfile.open(**profile) as dst:
            dst.write(predictions)

        s3_client.put_object(Bucket=bucket, Key=key, Body=memfile.read())
```

### Dockerfile (Lambda Container Image)

```dockerfile
FROM public.ecr.aws/lambda/python:3.11-arm64

# Install system dependencies
RUN yum install -y gcc-c++ cmake

# Copy requirements
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r requirements.txt --target ${LAMBDA_TASK_ROOT}

# Copy function code
COPY lambda_function.py ${LAMBDA_TASK_ROOT}/

CMD ["lambda_function.lambda_handler"]
```

**requirements.txt**:

```
torch==2.1.0
rasterio==1.3.9
numpy==1.26.2
boto3==1.34.10
```

### Terraform Configuration

```hcl
resource "aws_lambda_function" "soilviews_inference" {
  function_name = "soilviews-inference"
  role          = aws_iam_role.lambda_exec.arn

  # Container image
  image_uri     = "${aws_ecr_repository.lambda_repo.repository_url}:latest"
  package_type  = "Image"

  # ARM architecture
  architectures = ["arm64"]

  # Configuration
  memory_size = 10240  # 10 GB
  timeout     = 300    # 5 minutes

  # EFS mount for model cache
  file_system_config {
    arn              = aws_efs_access_point.lambda_models.arn
    local_mount_path = "/mnt/models"
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      MODEL_PATH = "/mnt/models/soilviews-efficientnet-b3.pt"
    }
  }
}

# Provisioned concurrency (optional, for zero cold starts)
resource "aws_lambda_provisioned_concurrency_config" "inference_warm" {
  function_name                     = aws_lambda_function.soilviews_inference.function_name
  provisioned_concurrent_executions = 2
  qualifier                         = aws_lambda_alias.production.name
}
```

## Consequences

### Positive

- ✅ **60% Cost Savings** vs. always-on EC2
- ✅ **Zero Idle Cost**: Pay only for actual inference time
- ✅ **Auto-Scaling**: Handles 1-1000 concurrent requests automatically
- ✅ **No Infrastructure**: AWS manages servers, scaling, patching
- ✅ **EFS Model Cache**: Fast warm starts (~2 s)

### Negative

- ❌ **Cold Start Latency**: 9 s (mitigated by provisioned concurrency)
- ❌ **10 GB Memory Limit**: Can't run larger models (e.g., ViT-Large)
- ❌ **Timeout Limit**: 15 minutes max (sufficient for SoilViews)
- ❌ **EFS Cost**: €0.30/GB/month (negligible for 1 GB model cache)

### Mitigation

- **Provisioned Concurrency**: 2 warm instances for peak hours (€15/mo)
- **Async Invocation**: Use SQS queue for batch processing (no timeout concerns)
- **Monitoring**: CloudWatch alarms for cold start rate > 10%

## Alternatives Considered

### SageMaker Inference Endpoints

**Pros**: Managed, auto-scaling, multi-model endpoints
**Cons**: 3× more expensive, overkill for simple inference

### ECS Fargate

**Pros**: More flexible than Lambda (no 10 GB limit)
**Cons**: More complex, higher baseline cost

## References

- [AWS Lambda ARM Documentation](https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html)
- [PyTorch on AWS Lambda](https://aws.amazon.com/blogs/compute/using-pytorch-on-aws-lambda/)
- [Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [EFS for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/services-efs.html)

## Revision History

- 2025-01-16: Initial draft (Accepted)
