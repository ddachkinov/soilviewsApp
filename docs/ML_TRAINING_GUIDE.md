# SoilViews Model Training Guide

**Complete guide for training the EfficientNet-b3 + DeepLabV3+ soil property prediction model**

---

## Table of Contents

1. [Overview](#overview)
2. [Training Data Requirements](#training-data-requirements)
3. [Sample-to-Satellite Cross-Mapping Strategy](#sample-to-satellite-cross-mapping-strategy)
4. [Training Platform Options](#training-platform-options)
5. [Step-by-Step Training Process](#step-by-step-training-process)
6. [Model Validation](#model-validation)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Model Architecture

**Encoder**: EfficientNet-b3 (ImageNet pre-trained)
- 12M parameters
- Accepts 10-channel input (8 Sentinel-2 + 2 Sentinel-1)
- Compound scaling for efficiency

**Decoder**: DeepLabV3+
- Atrous Spatial Pyramid Pooling (ASPP)
- Decoder module for fine spatial details
- Outputs 7 channels (soil properties)

### Target Performance

- **R² ≥ 0.78** for yield prediction (MDPI 2025 benchmark)
- **RMSE < 0.5 pH units** for soil pH
- **RMSE < 1.0%** for organic matter
- **RMSE < 20 mg/kg** for N/P/K

---

## Training Data Requirements

### 1. Ground-Truth Soil Samples

**Minimum Requirements:**
- **Quantity**: ≥ 5,000 samples for baseline model
- **Spatial Coverage**: Representative of Bulgarian soil types
  - Haplic Chernozem (dominant in Northern Bulgaria)
  - Luvisols (Central Bulgaria)
  - Cambisols (mountainous regions)
- **Temporal Range**: Multiple seasons to capture variability
- **Properties Measured**:
  - pH (1:5 water extraction, ISO 10390)
  - Organic Matter % (Walkley-Black or LOI)
  - Nitrogen (mg/kg, Kjeldahl method)
  - Phosphorus (mg/kg, Olsen method)
  - Potassium (mg/kg, ammonium acetate extraction)
  - Texture (clay %, sand %, silt % - laser diffraction)
  - Depth to bedrock (cm, field measurement)

**Data Format:**
```csv
sample_id,latitude,longitude,sample_date,depth_cm,ph,om_pct,n_mg_kg,p_mg_kg,k_mg_kg,clay_pct,sand_pct,municipality,lab_method
BG-001,42.7339,25.4858,2024-04-15,20,6.8,3.2,120.5,45.2,280.3,32.5,28.1,Parvomay,ISO 10390
BG-002,42.7401,25.4920,2024-04-16,20,7.1,2.9,105.3,38.7,265.8,35.2,25.4,Parvomay,ISO 10390
```

### 2. Satellite Imagery (Sentinel-2)

**Acquisition Strategy:**

**Option A: Bare-Soil Window (Recommended)**
- **Period**: March 15 - April 30 (spring bare-soil in Bulgaria)
- **Rationale**: Minimizes vegetation interference
- **Cloud Coverage**: < 10%
- **Processing Level**: L2A (Bottom-of-Atmosphere)

**Option B: Multi-Temporal Composite**
- **Dates**: 3-5 cloud-free images throughout year
- **Rationale**: Captures seasonal soil moisture variations
- **Median Composite**: Reduces noise

**Bands Required:**
| Band | Wavelength (nm) | Resolution | Purpose |
|------|-----------------|------------|---------|
| B2   | 490 (Blue)      | 10 m       | Soil color, carbonate detection |
| B3   | 560 (Green)     | 10 m       | Vegetation monitoring |
| B4   | 665 (Red)       | 10 m       | Chlorophyll absorption |
| B5   | 705 (Red Edge 1)| 20 m ↓10m  | Vegetation stress, soil background |
| B6   | 740 (Red Edge 2)| 20 m ↓10m  | Vegetation/soil transition |
| B7   | 783 (Red Edge 3)| 20 m ↓10m  | Moisture content |
| B8   | 842 (NIR)       | 10 m       | Biomass, soil moisture |
| B11  | 1610 (SWIR1)    | 20 m ↓10m  | Soil moisture, clay minerals |

**Preprocessing:**
1. Atmospheric correction (L2A via Sen2Cor)
2. Cloud masking (SCL layer)
3. Resampling to 10 m (bilinear for 20 m bands)
4. Normalization (0-10000 → 0.0-1.0)

### 3. Sentinel-1 SAR Data (Optional but Recommended)

**Rationale**: All-weather, penetrates clouds, sensitive to soil moisture

**Bands:**
- VV polarization (vertical transmit, vertical receive)
- VH polarization (vertical transmit, horizontal receive)

**Processing:**
1. Radiometric calibration (σ⁰ backscatter)
2. Speckle filtering (Lee filter, 5×5 window)
3. Terrain correction (SRTM DEM)

---

## Sample-to-Satellite Cross-Mapping Strategy

### Problem Statement

**Challenge**: Small soil sample area (0.25 m² typical) vs. large satellite pixel (10 m × 10 m = 100 m²)

**Goal**: Learn relationship between:
- **Input X**: Sentinel-2/1 spectral signatures (10 m pixels)
- **Output Y**: Soil properties from point samples

### Cross-Mapping Methodology

#### Step 1: Spatial Alignment

```python
import geopandas as gpd
import rasterio
from rasterio.mask import mask
from shapely.geometry import Point, box

def extract_pixel_for_sample(sample_lat, sample_lon, sentinel2_cog_path):
    """
    Extract 10m pixel values at sample location.

    Args:
        sample_lat, sample_lon: GPS coordinates of soil sample
        sentinel2_cog_path: Path to Sentinel-2 COG

    Returns:
        dict: Pixel values for all 8 bands
    """
    # Create 10m buffer around sample point (single pixel)
    sample_point = Point(sample_lon, sample_lat)
    pixel_buffer = sample_point.buffer(0.00005)  # ~10m at 42°N latitude

    with rasterio.open(sentinel2_cog_path) as src:
        # Extract pixel values
        out_image, out_transform = mask(src, [pixel_buffer], crop=True)

        # Average values within pixel (handles edge cases)
        pixel_values = {
            f'B{band}': out_image[band-1].mean()
            for band in range(1, 9)
        }

    return pixel_values

# Example usage
sample = {
    'id': 'BG-001',
    'lat': 42.7339,
    'lon': 25.4858,
    'ph': 6.8,
    'om_pct': 3.2,
    # ... other properties
}

sentinel2_path = 's3://soilviews-cogs/sentinel2-2024-04-15-parvomay.tif'
pixel_data = extract_pixel_for_sample(sample['lat'], sample['lon'], sentinel2_path)

# Create training example
training_example = {
    'input': pixel_data,  # 8-band spectral signature
    'target': {
        'ph': sample['ph'],
        'om_pct': sample['om_pct'],
        # ... other soil properties
    }
}
```

#### Step 2: Temporal Matching

**Problem**: Soil sample date may not match Sentinel-2 acquisition date

**Solution**:
1. **Exact Match** (preferred): Use Sentinel-2 image from ±7 days of sample date
2. **Seasonal Match**: Use bare-soil composite from same season
3. **Multi-Temporal**: Average of 3 closest cloud-free images

```python
from datetime import datetime, timedelta

def find_matching_sentinel_image(sample_date, sentinel_catalog):
    """
    Find Sentinel-2 image closest to sample date.

    Args:
        sample_date: Date of soil sample collection
        sentinel_catalog: List of available Sentinel-2 images

    Returns:
        str: Path to closest image (within 7-day window)
    """
    sample_dt = datetime.strptime(sample_date, '%Y-%m-%d')

    # Filter images within ±7 days
    candidates = [
        img for img in sentinel_catalog
        if abs((img['date'] - sample_dt).days) <= 7
        and img['cloud_coverage'] < 10
    ]

    if not candidates:
        # Fallback: use seasonal bare-soil composite
        return get_seasonal_composite(sample_dt.month)

    # Return closest match
    return min(candidates, key=lambda x: abs((x['date'] - sample_dt).days))
```

#### Step 3: Handling Spatial Heterogeneity

**Issue**: Soil properties vary within 10 m pixel

**Strategies**:

**A. Point-to-Pixel Direct Mapping** (Baseline)
- Assume sample represents entire pixel
- Works well for homogeneous fields
- **Training examples**: N samples = N pixels

**B. Multi-Sample Averaging** (if available)
- If multiple samples within same pixel → average soil values
- Reduces spatial noise
- **Training examples**: N unique pixels

**C. Spatial Context Window** (Advanced)
- Extract 3×3 or 5×5 pixel window around sample
- CNN learns spatial patterns
- Increases model robustness

```python
def extract_spatial_context(sample_lat, sample_lon, sentinel2_path, window_size=3):
    """
    Extract NxN pixel window around sample for spatial context.

    Args:
        window_size: 3 for 30m×30m, 5 for 50m×50m

    Returns:
        np.ndarray: Shape (8, window_size, window_size)
    """
    # Create window geometry
    pixel_size_deg = 0.0001  # ~10m
    half_window = (window_size // 2) * pixel_size_deg

    window_box = box(
        sample_lon - half_window,
        sample_lat - half_window,
        sample_lon + half_window,
        sample_lat + half_window
    )

    with rasterio.open(sentinel2_path) as src:
        out_image, _ = mask(src, [window_box], crop=True)

    return out_image  # Shape: (8, window_size, window_size)
```

#### Step 4: Data Augmentation for Spatial Generalization

**Problem**: Limited samples → model overfits to specific locations

**Solutions**:

1. **Spatial Jitter**: Randomly shift sample location by ±5 m
   ```python
   import random
   jittered_lat = sample_lat + random.uniform(-0.00005, 0.00005)
   jittered_lon = sample_lon + random.uniform(-0.00005, 0.00005)
   ```

2. **Synthetic Samples from Interpolation**:
   - Use kriging to interpolate soil properties between known samples
   - Extract Sentinel-2 pixels at interpolated locations
   - **Caution**: Only in dense sampling areas

3. **Multi-Season Augmentation**:
   - Pair same sample with Sentinel-2 from different seasons
   - Model learns season-invariant soil features

#### Step 5: Field-Level Aggregation (Inference)

**Training**: Point samples → pixel-level predictions

**Inference**: Predict entire field (polygon)

```python
def predict_field_soil_map(field_polygon, model, sentinel2_path):
    """
    Generate wall-to-wall soil property map for field.

    Args:
        field_polygon: Shapely Polygon of field boundary
        model: Trained PyTorch model
        sentinel2_path: Sentinel-2 COG covering field

    Returns:
        np.ndarray: Soil property predictions (H, W, 7)
    """
    with rasterio.open(sentinel2_path) as src:
        # Clip Sentinel-2 to field boundary
        out_image, out_transform = mask(src, [field_polygon], crop=True)
        # Shape: (8, H, W)

        # Normalize
        sentinel_normalized = out_image / 10000.0

        # Reshape for model: (H, W, 8) → (1, 8, H, W)
        input_tensor = torch.from_numpy(sentinel_normalized).unsqueeze(0).float()

        # Predict
        with torch.no_grad():
            predictions = model(input_tensor)  # (1, 7, H, W)

        # Post-process
        predictions_np = predictions.squeeze(0).cpu().numpy()  # (7, H, W)
        predictions_hwc = np.transpose(predictions_np, (1, 2, 0))  # (H, W, 7)

        return predictions_hwc
```

### Cross-Validation Strategy

**Spatial Cross-Validation** (NOT random split!)

**Why**: Avoid spatial autocorrelation bias

```python
from sklearn.model_selection import GroupKFold

# Group samples by municipality or 10 km grid cell
samples['group'] = samples['municipality']  # or samples['grid_cell_id']

gkf = GroupKFold(n_splits=5)

for fold, (train_idx, val_idx) in enumerate(gkf.split(samples, groups=samples['group'])):
    train_samples = samples.iloc[train_idx]
    val_samples = samples.iloc[val_idx]

    # Train model on train_samples
    # Validate on val_samples (completely different geographic areas)
```

---

## Training Platform Options

### Option 1: Local GPU (Baseline)

**Requirements**:
- NVIDIA GPU with ≥ 12 GB VRAM (RTX 3080 Ti, RTX 4090, or better)
- Ubuntu 20.04+ with CUDA 11.8+
- Python 3.11 virtual environment

**Pros**:
- ✅ Full control
- ✅ No recurring costs
- ✅ Fast iteration for debugging

**Cons**:
- ❌ Limited to single GPU
- ❌ Requires local hardware investment

**Setup**:
```bash
# Install CUDA
wget https://developer.download.nvidia.com/compute/cuda/11.8.0/local_installers/cuda_11.8.0_520.61.05_linux.run
sudo sh cuda_11.8.0_520.61.05_linux.run

# Install PyTorch
pip install torch==2.1.0+cu118 torchvision==0.16.0+cu118 -f https://download.pytorch.org/whl/torch_stable.html

# Train
cd packages/ml-pipeline
python train.py --config configs/efficientnet-b3.yaml --gpus 1
```

---

### Option 2: AWS SageMaker (Production)

**Recommended Instance**: `ml.p3.2xlarge` (1× V100 GPU, 16 GB VRAM)

**Cost**: ~€3.50/hour = €84 for 24-hour training run

**Pros**:
- ✅ Managed infrastructure
- ✅ Easy scaling to multi-GPU
- ✅ Built-in experiment tracking
- ✅ Spot instances (70% cost savings)

**Cons**:
- ❌ Hourly billing
- ❌ More complex setup

**Setup**:
```python
# sagemaker_train.py
import sagemaker
from sagemaker.pytorch import PyTorch

estimator = PyTorch(
    entry_point='train.py',
    source_dir='packages/ml-pipeline',
    role='SageMakerExecutionRole',
    instance_type='ml.p3.2xlarge',
    instance_count=1,
    framework_version='2.1.0',
    py_version='py311',
    hyperparameters={
        'epochs': 100,
        'batch-size': 4,
        'learning-rate': 1e-4
    },
    use_spot_instances=True,  # 70% cost savings!
    max_wait=86400  # 24 hours
)

estimator.fit({'training': 's3://soilviews-training-data/'})
```

---

### Option 3: IBM Watson X Studio (Recommended for Enterprise)

#### Overview

**IBM Watson X** (formerly Watson Studio) is IBM's enterprise AI platform with integrated:
- Data preparation tools
- AutoML capabilities
- Model training (GPU-accelerated)
- MLOps pipelines
- Governance and explainability

#### Key Advantages for SoilViews

✅ **Geospatial Data Support**: Built-in support for raster data (GeoTIFF, COG)
✅ **AutoML**: Automatically finds optimal hyperparameters
✅ **Federated Learning**: Train on distributed soil sample datasets (compliance-friendly)
✅ **Explainability**: LIME/SHAP integration for model transparency
✅ **Compliance**: GDPR-compliant infrastructure (EU data residency)
✅ **Integration**: Works with PostgreSQL + PostGIS
✅ **Cost**: More expensive than AWS but includes managed features

#### Architecture with Watson X

```
┌─────────────────────────────────────────────────────────┐
│ IBM Watson X Studio                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Data Preparation                                       │
│  ├── Import Sentinel-2 COGs from S3                    │
│  ├── Import ground-truth CSV from PostgreSQL           │
│  └── Spatial join (sample coords → pixels)             │
│                                                         │
│  AutoML Experiment                                      │
│  ├── Algorithm: Neural Network (PyTorch)               │
│  ├── Architecture: Custom (EfficientNet-b3)            │
│  ├── Hyperparameter Tuning: Bayesian Optimization      │
│  └── Cross-Validation: Spatial (5-fold)                │
│                                                         │
│  Model Training                                         │
│  ├── GPU: NVIDIA V100 (16 GB)                          │
│  ├── Epochs: Auto-stop (early stopping)                │
│  ├── Metrics: R², RMSE, MAE per soil property          │
│  └── Experiment Tracking: Built-in                     │
│                                                         │
│  Model Deployment                                       │
│  ├── Export: ONNX or TorchScript                       │
│  ├── Endpoint: REST API (optional)                     │
│  └── Batch Scoring: Process entire fields              │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ↓ Export Model
         ↓
┌─────────────────────────────────────────────────────────┐
│ AWS Lambda (SoilViews Inference)                       │
│ - Load ONNX model from EFS                             │
│ - Predict on Sentinel-2 COGs                           │
└─────────────────────────────────────────────────────────┘
```

#### Setup Guide for Watson X Studio

**Step 1: Create Watson X Project**

1. Go to [IBM Cloud Console](https://cloud.ibm.com/)
2. Create Watson X instance:
   - Region: EU (Frankfurt) for GDPR compliance
   - Plan: Standard or Enterprise
3. Create new Project: "SoilViews Soil Property Prediction"
4. Add Cloud Object Storage (COS) for data

**Step 2: Prepare Data Assets**

```python
# watson_data_prep.py
from ibm_watson_studio_lib import WSX

# Initialize Watson X client
wsx = WSX(api_key='YOUR_API_KEY', project_id='YOUR_PROJECT_ID')

# Upload Sentinel-2 data
wsx.upload_asset(
    name='sentinel2-training-data',
    file_path='s3://soilviews-cogs/training/sentinel2/',
    asset_type='data'
)

# Upload ground-truth samples
wsx.upload_asset(
    name='soil-samples',
    file_path='./data/bulgarian-soil-samples.parquet',
    asset_type='data'
)

# Create data preparation flow
data_flow = wsx.create_data_flow('SoilViews Data Prep')
data_flow.add_step('Join Sentinel-2 with Samples', {
    'left': 'sentinel2-training-data',
    'right': 'soil-samples',
    'on': ['latitude', 'longitude'],
    'method': 'spatial'  # Match pixels to sample locations
})
data_flow.run()
```

**Step 3: Custom Model Training**

Watson X supports custom PyTorch models:

```python
# watson_train.py
from ibm_watson_machine_learning import APIClient

# Configure Watson ML
wml_credentials = {
    "url": "https://eu-de.ml.cloud.ibm.com",
    "apikey": "YOUR_API_KEY"
}
client = APIClient(wml_credentials)
client.set.default_space('YOUR_SPACE_ID')

# Define custom model metadata
model_metadata = {
    "name": "SoilViews EfficientNet-b3",
    "type": "pytorch_2.1",
    "software_spec_uid": client.software_specifications.get_uid_by_name("pytorch_2.1"),
    "custom_library_uid": "YOUR_CUSTOM_LIB_UID"  # Upload segmentation-models-pytorch
}

# Upload training script
client.repository.store_model(
    model='packages/ml-pipeline/train.py',
    meta_props=model_metadata,
    training_data_references=[{
        'type': 'fs',
        'location': {
            'bucket': 'soilviews-training',
            'path': 'training-data/'
        }
    }]
)

# Start training job
job_details = client.training.run('YOUR_MODEL_UID', {
    'training_data_references': [...],
    'results_reference': {
        'type': 'fs',
        'location': {'bucket': 'soilviews-models'}
    },
    'training_params': {
        'epochs': 100,
        'batch_size': 4,
        'learning_rate': 1e-4
    }
})

# Monitor progress
client.training.monitor_logs(job_details['metadata']['guid'])
```

**Step 4: Hyperparameter Optimization (AutoAI)**

Watson X AutoAI can find optimal hyperparameters:

```python
from ibm_watson_machine_learning.experiment import AutoAI

# Initialize AutoAI experiment
autoai = AutoAI(wml_credentials, project_id='YOUR_PROJECT_ID')

# Configure experiment
experiment = autoai.regression(
    training_data_reference='soil-training-data',
    target_column='ph',  # Start with pH prediction
    prediction_type='regression',
    optimization_metric='r2',
    max_number_of_estimators=4,
    include_only_estimators=['PyTorchRegressor']  # Custom estimator
)

# Run experiment (tests 20+ hyperparameter combinations)
experiment.run()

# Get best model
best_pipeline = experiment.summary()['best_pipeline']
```

**Step 5: Model Export for AWS Lambda**

```python
# Export trained model to ONNX for Lambda
import torch
import onnx

# Load best model from Watson X
model = client.repository.download('BEST_MODEL_UID')

# Convert to ONNX
dummy_input = torch.randn(1, 10, 256, 256)  # 10 bands, 256x256 image
torch.onnx.export(
    model,
    dummy_input,
    'soilviews-model.onnx',
    input_names=['image'],
    output_names=['predictions'],
    dynamic_axes={
        'image': {2: 'height', 3: 'width'},
        'predictions': {2: 'height', 3: 'width'}
    }
)

# Upload to S3 for Lambda
import boto3
s3 = boto3.client('s3')
s3.upload_file('soilviews-model.onnx', 'soilviews-models', 'production/model.onnx')
```

#### Cost Comparison

| Platform        | Instance Type     | GPU  | Cost/Hour | 24h Training | Annual Ops |
|-----------------|-------------------|------|-----------|--------------|------------|
| Local GPU       | RTX 4090         | 1    | €0 (CapEx)| €0           | €0         |
| AWS SageMaker   | ml.p3.2xlarge    | V100 | €3.50     | €84          | €1,000*    |
| **Watson X**    | **Watson GPU**   | **V100** | **€5.00** | **€120** | **€1,500*** |
| Google Vertex AI| n1-highmem-8 + V100 | V100 | €3.20  | €77          | €900*      |

_*Assumes 10 training runs + monthly retraining_

#### Watson X Verdict

**When to Use Watson X**:
- ✅ Enterprise customer with IBM ecosystem
- ✅ Need for explainable AI (regulatory compliance)
- ✅ Federated learning across multiple Bulgarian research institutions
- ✅ EU data residency requirements (GDPR)
- ✅ Want AutoML for faster experimentation

**When to Skip**:
- ❌ Budget-constrained (AWS/Azure cheaper)
- ❌ Small-scale project (local GPU sufficient)
- ❌ Already invested in AWS/Azure ecosystem

**Recommendation for SoilViews**:
- **Development**: Local GPU or AWS SageMaker Spot
- **Production**: AWS Lambda (cost-effective at scale)
- **Enterprise Edition**: Watson X for explainability + governance

---

## Step-by-Step Training Process

### Phase 1: Data Collection (Weeks 1-4)

1. **Acquire Ground-Truth Samples**
   - Partner with:
     - Bulgarian Ministry of Agriculture (347 national grid samples)
     - Carbonsafe (commercial soil sampling service)
     - NIK Agro (AgroBalance platform users)
   - Target: 5,000+ samples across Bulgaria

2. **Download Sentinel-2 Imagery**
   ```bash
   # Using Sentinel-Hub API
   python scripts/download_sentinel2.py \
     --region bulgaria \
     --date-range 2024-03-15,2024-04-30 \
     --max-cloud-coverage 10 \
     --output s3://soilviews-training/sentinel2/
   ```

3. **Organize Dataset**
   ```
   data/
   ├── ground_truth/
   │   ├── samples.parquet          # All soil samples
   │   └── samples_metadata.json     # Collection methods, QA flags
   ├── sentinel2/
   │   ├── 2024-03-15-bulgaria.tif  # 8-band composites
   │   ├── 2024-03-22-bulgaria.tif
   │   └── ...
   ├── sentinel1/
   │   └── 2024-03-15-bulgaria-vv-vh.tif
   └── train_val_split.csv          # Spatial cross-validation groups
   ```

### Phase 2: Data Preprocessing (Week 5)

```python
# scripts/preprocess_training_data.py
import pandas as pd
import geopandas as gpd
import rasterio

# 1. Load ground-truth samples
samples = pd.read_parquet('data/ground_truth/samples.parquet')

# 2. Quality filtering
samples_clean = samples[
    (samples['ph'] >= 4) & (samples['ph'] <= 9) &  # Valid pH range
    (samples['om_pct'] >= 0) & (samples['om_pct'] <= 15) &  # Valid OM range
    (samples['data_quality'] == 'GOOD')  # QA flag
]

# 3. Spatial cross-validation groups (by municipality)
samples_clean['cv_group'] = samples_clean['municipality']

# 4. Extract Sentinel-2 pixels for each sample
def extract_features(row):
    sentinel2_path = f"data/sentinel2/{row['sample_date'].strftime('%Y-%m-%d')}-bulgaria.tif"
    pixel_values = extract_pixel_for_sample(row['latitude'], row['longitude'], sentinel2_path)
    return pixel_values

samples_clean['sentinel2_features'] = samples_clean.apply(extract_features, axis=1)

# 5. Save processed dataset
samples_clean.to_parquet('data/processed/training_dataset.parquet')
```

### Phase 3: Model Training (Weeks 6-8)

```bash
# Start training with experiment tracking
cd packages/ml-pipeline
python train.py \
  --config configs/efficientnet-b3.yaml \
  --data-path ../../data/processed/training_dataset.parquet \
  --gpus 1 \
  --max-epochs 100 \
  --batch-size 4 \
  --wandb-project soilviews \
  --wandb-run-name efficientnet-b3-baseline
```

**Monitor Training**:
```python
# View in Weights & Biases
wandb login
# Open: https://wandb.ai/soilviews/soilviews
```

**Expected Timeline**:
- Epochs: ~100 (with early stopping)
- Time per epoch: ~10 min (on V100 GPU, 5K samples)
- Total training time: ~16 hours
- Best model typically at epoch 60-80

### Phase 4: Validation (Week 9)

```python
# scripts/validate_model.py
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import numpy as np

# Load best checkpoint
model = torch.jit.load('checkpoints/soilviews-epoch=78-val_r2=0.812.pt')

# Validate on held-out municipalities
val_samples = samples[samples['municipality'].isin(['Sofia', 'Plovdiv', 'Varna'])]

predictions = []
targets = []

for idx, sample in val_samples.iterrows():
    # Extract Sentinel-2 pixel
    pixel = extract_pixel(sample)

    # Predict
    with torch.no_grad():
        pred = model(pixel.unsqueeze(0))

    predictions.append(pred.cpu().numpy())
    targets.append([sample['ph'], sample['om_pct'], ...])

predictions = np.array(predictions)
targets = np.array(targets)

# Calculate metrics per soil property
properties = ['pH', 'OM%', 'N', 'P', 'K', 'Clay%', 'Sand%']
for i, prop in enumerate(properties):
    r2 = r2_score(targets[:, i], predictions[:, i])
    rmse = np.sqrt(mean_squared_error(targets[:, i], predictions[:, i]))
    print(f"{prop}: R²={r2:.3f}, RMSE={rmse:.3f}")
```

**Acceptance Criteria**:
- pH: R² ≥ 0.75, RMSE ≤ 0.5
- OM: R² ≥ 0.70, RMSE ≤ 1.0%
- N/P/K: R² ≥ 0.65, RMSE ≤ 25 mg/kg

### Phase 5: Deployment (Week 10)

```bash
# Export to TorchScript for Lambda
python scripts/export_model.py \
  --checkpoint checkpoints/soilviews-epoch=78-val_r2=0.812.pt \
  --output models/soilviews-production-v1.0.pt

# Upload to AWS S3 → EFS
aws s3 cp models/soilviews-production-v1.0.pt \
  s3://soilviews-models/production/model.pt

# Update Lambda environment variable
aws lambda update-function-configuration \
  --function-name soilviews-inference-production \
  --environment "Variables={MODEL_VERSION=v1.0}"
```

---

## Model Validation

### Metrics

**Pixel-Level Metrics** (during training):
- R² (coefficient of determination)
- RMSE (Root Mean Squared Error)
- MAE (Mean Absolute Error)
- Per-property metrics (pH, OM, N, P, K separate)

**Field-Level Metrics** (inference validation):
- Field-average RMSE vs. composite soil sample
- Spatial consistency (variogram analysis)
- Edge effects (boundary pixels)

### Validation Datasets

1. **Held-out municipalities** (spatial CV fold)
2. **Temporal validation**: 2023 samples vs. 2024 imagery
3. **External validation**: Independent research datasets (if available)

---

## Deployment

See **ADR-006** for serverless deployment architecture.

**Production Checklist**:
- ✅ Model achieves R² ≥ 0.75 on validation set
- ✅ TorchScript export successful (< 100 MB file size)
- ✅ Lambda cold start < 10 s
- ✅ Inference time < 30 s for 20 ha field
- ✅ Cost per inference < €0.03

---

## Troubleshooting

### Issue 1: Low R² on Validation

**Symptoms**: R² < 0.60, high validation loss

**Causes**:
- Insufficient training data
- Spatial autocorrelation in train/val split
- Domain shift (different soil types in validation)

**Solutions**:
1. Collect more samples from underrepresented regions
2. Use spatial cross-validation (not random split)
3. Add data augmentation (jittering, multi-season)
4. Reduce model complexity (try ResNet-50 instead of EfficientNet-b3)

### Issue 2: Overfitting

**Symptoms**: Train R² = 0.95, Val R² = 0.55

**Solutions**:
- Add dropout (p=0.3) to decoder
- L2 regularization (weight_decay=1e-4)
- Reduce model capacity (EfficientNet-b0)
- More data augmentation

### Issue 3: Poor Performance on Specific Soil Property

**Example**: pH R² = 0.80, but Clay% R² = 0.40

**Solutions**:
- Clay content has weak spectral signature → add Sentinel-1 SAR
- Use multi-task learning with weighted losses:
  ```python
  loss = 2.0 * clay_loss + 1.0 * ph_loss + ...
  ```
- Add auxiliary task (predict NDVI) to improve soil feature learning

---

## Summary

**Training Timeline**: 10 weeks (data collection → deployment)

**Recommended Platform**:
- **Small-scale** (< 10K samples): Local GPU
- **Medium-scale** (10K-100K): AWS SageMaker Spot
- **Enterprise**: IBM Watson X (explainability + AutoML)

**Key Success Factors**:
1. ✅ Spatial cross-validation (avoid overfitting)
2. ✅ Bare-soil imagery (March-April in Bulgaria)
3. ✅ Quality ground-truth (lab-analyzed, ISO-compliant)
4. ✅ Multi-temporal data (reduce temporal noise)
5. ✅ Domain expertise (agronomist review of predictions)

---

**Next Steps**: See `docs/ml-pipeline/watson-x-integration.md` for Watson X setup details.
