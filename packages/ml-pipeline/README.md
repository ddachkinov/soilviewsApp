# SoilViews ML Pipeline

PyTorch Lightning training pipeline for soil property prediction from Sentinel-2 imagery.

## Architecture

- **Encoder**: EfficientNet-b3 (ImageNet pre-trained)
- **Decoder**: DeepLabV3+ (atrous spatial pyramid pooling)
- **Input**: 10-band (8 Sentinel-2 + 2 Sentinel-1)
- **Output**: 7 soil properties (pH, OM, N, P, K, Clay%, Sand%)

## Quick Start

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Train model
python train.py --config configs/efficientnet-b3.yaml

# Run inference
python inference.py --model checkpoints/best.pth --input data/sample/field.tif
```

## References

- ADR-003: PyTorch Lightning architecture
- ADR-006: AWS Lambda serverless inference
- MDPI 2025 yield prediction study (R² = 0.78)
