# ADR-003: PyTorch Lightning for ML Training Architecture

## Status

Accepted

## Context

SoilViews requires a deep learning model to predict soil properties (pH, OM, N, P, K,
texture, depth) from multi-spectral Sentinel-2 imagery. We need to choose:

1. **ML Framework**: TensorFlow, PyTorch, JAX
2. **Model Architecture**: CNN encoder + segmentation head
3. **Training Framework**: Raw framework vs. high-level wrapper
4. **Deployment Format**: ONNX, TorchScript, TensorFlow SavedModel

### Requirements

- 8-band Sentinel-2 input (B2, B3, B4, B5, B6, B7, B8, B11) + 2-band Sentinel-1 (VV, VH)
- Dense pixel-wise prediction (semantic segmentation)
- Transfer learning from ImageNet pre-trained models
- GPU training (single or multi-GPU)
- Experiment tracking (hyperparameters, metrics, artifacts)
- Production deployment on AWS Lambda (CPU inference)

## Decision

We will use:

- **Framework**: **PyTorch 2.1**
- **Training Wrapper**: **PyTorch Lightning 2.1**
- **Encoder**: **EfficientNet-b3** (timm library, ImageNet pre-trained)
- **Decoder**: **DeepLabV3+** (atrous spatial pyramid pooling)
- **Deployment**: **TorchScript** (.pt) for Lambda, **ONNX** (.onnx) for edge devices

## Rationale

### Why PyTorch?

1. **Research Adoption**: 75% of CVPR 2024 papers use PyTorch
2. **Flexibility**: Dynamic computation graphs (easier debugging)
3. **Ecosystem**: timm (pre-trained models), torchgeo (geospatial), segmentation_models_pytorch
4. **Production**: TorchScript for deployment, ONNX export support
5. **Community**: Larger than TensorFlow for research

### Why PyTorch Lightning?

| Feature                  | Raw PyTorch | **Lightning** |
| ------------------------ | ----------- | ------------- |
| Boilerplate Code         | High        | **Minimal**   |
| Multi-GPU (DDP)          | Manual      | **Automatic** |
| 16-bit Training          | Complex     | **1 Flag**    |
| Experiment Tracking      | Manual      | **Built-in**  |
| Checkpointing            | Manual      | **Automatic** |
| Learning Rate Scheduling | Manual      | **Built-in**  |
| Reproducibility          | Manual      | **Seeded**    |

**Lightning reduces training code by ~60%** while maintaining full PyTorch flexibility.

### Why EfficientNet-b3?

**Comparison of Encoders**:

| Model          | Params | ImageNet Acc | Inference (ms) | Choice          |
| -------------- | ------ | ------------ | -------------- | --------------- |
| ResNet-50      | 25M    | 76.1%        | 12             | Baseline        |
| EfficientNet-b0| 5M     | 77.3%        | 8              | Too small       |
| **EfficientNet-b3**| **12M** | **81.7%** | **15**     | **✅ Selected** |
| EfficientNet-b5| 30M    | 83.6%        | 35             | Too slow        |
| ConvNeXt-T     | 28M    | 82.1%        | 18             | Alternative     |

**EfficientNet-b3** offers the best balance of:

- Accuracy (ImageNet features transfer well to remote sensing)
- Speed (15 ms inference on Lambda)
- Size (12M params → 48 MB model file)

### Why DeepLabV3+?

**Segmentation Head Comparison**:

| Architecture | Pros                                  | Cons                 |
| ------------ | ------------------------------------- | -------------------- |
| FCN          | Simple                                | Loses spatial detail |
| U-Net        | Skip connections preserve details     | Large memory         |
| **DeepLabV3+**| **Atrous conv for multi-scale context** | **Complexity**   |
| SegFormer    | Transformer-based, SOTA               | Slow, large          |

**DeepLabV3+** is ideal because:

- Atrous Spatial Pyramid Pooling (ASPP) captures multi-scale soil patterns
- Decoder recovers spatial resolution for 10 m predictions
- Proven on remote sensing tasks (e.g., DeepGlobe, SpaceNet)

## Implementation

### Model Architecture

```python
import torch
import torch.nn as nn
import segmentation_models_pytorch as smp

class SoilPropertyModel(nn.Module):
    def __init__(self, in_channels=10, out_channels=7):
        super().__init__()
        self.model = smp.DeepLabV3Plus(
            encoder_name='efficientnet-b3',
            encoder_weights='imagenet',
            in_channels=in_channels,  # 8 S2 bands + 2 S1 bands
            classes=out_channels,      # pH, OM, N, P, K, Clay%, Sand%
            activation=None            # Raw logits (apply transform later)
        )

    def forward(self, x):
        return self.model(x)
```

### PyTorch Lightning Training Module

```python
import pytorch_lightning as pl
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR

class SoilPredictionModule(pl.LightningModule):
    def __init__(self, learning_rate=1e-4):
        super().__init__()
        self.save_hyperparameters()
        self.model = SoilPropertyModel()
        self.loss_fn = nn.MSELoss()

    def forward(self, x):
        return self.model(x)

    def training_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self(x)
        loss = self.loss_fn(y_hat, y)
        self.log('train_loss', loss)
        return loss

    def validation_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self(x)
        loss = self.loss_fn(y_hat, y)
        r2 = self.compute_r2(y_hat, y)
        self.log('val_loss', loss, prog_bar=True)
        self.log('val_r2', r2, prog_bar=True)

    def configure_optimizers(self):
        optimizer = AdamW(self.parameters(), lr=self.hparams.learning_rate)
        scheduler = CosineAnnealingLR(optimizer, T_max=100)
        return [optimizer], [scheduler]

    def compute_r2(self, y_pred, y_true):
        # R² calculation per soil property
        ss_res = torch.sum((y_true - y_pred) ** 2, dim=(0, 2, 3))
        ss_tot = torch.sum((y_true - y_true.mean(dim=(0, 2, 3), keepdim=True)) ** 2, dim=(0, 2, 3))
        return (1 - ss_res / ss_tot).mean()
```

### Training Script

```python
from pytorch_lightning import Trainer
from pytorch_lightning.callbacks import ModelCheckpoint, EarlyStopping
from pytorch_lightning.loggers import WandbLogger

# Initialize model
model = SoilPredictionModule(learning_rate=1e-4)

# Callbacks
checkpoint_callback = ModelCheckpoint(
    monitor='val_r2',
    mode='max',
    filename='soilviews-{epoch:02d}-{val_r2:.3f}',
    save_top_k=3
)
early_stop_callback = EarlyStopping(monitor='val_loss', patience=10)

# Logger
wandb_logger = WandbLogger(project='soilviews', name='efficientnet-b3-run1')

# Trainer
trainer = Trainer(
    max_epochs=100,
    accelerator='gpu',
    devices=1,
    precision='16-mixed',  # Automatic Mixed Precision
    callbacks=[checkpoint_callback, early_stop_callback],
    logger=wandb_logger
)

# Train
trainer.fit(model, train_dataloader, val_dataloader)
```

### TorchScript Export for Lambda

```python
# Export to TorchScript (for AWS Lambda)
model.eval()
scripted_model = torch.jit.script(model)
scripted_model.save('model.pt')

# ONNX export (for edge devices)
dummy_input = torch.randn(1, 10, 256, 256)
torch.onnx.export(
    model,
    dummy_input,
    'model.onnx',
    input_names=['image'],
    output_names=['predictions'],
    dynamic_axes={'image': {2: 'height', 3: 'width'}}
)
```

## Consequences

### Positive

- ✅ 60% less boilerplate vs. raw PyTorch
- ✅ Automatic multi-GPU training (DistributedDataParallel)
- ✅ Built-in 16-bit mixed precision (2x faster training)
- ✅ Reproducible experiments (seeded RNG, deterministic ops)
- ✅ Easy integration with Weights & Biases, TensorBoard
- ✅ Production-ready export (TorchScript, ONNX)

### Negative

- ❌ Lightning abstraction has learning curve
- ❌ Some advanced PyTorch features require workarounds
- ❌ TorchScript has limitations (no dynamic control flow in some cases)

### Mitigation

- Provide training notebooks with Lightning examples
- Use Lightning's `manual_optimization` for custom training loops if needed
- Test TorchScript export early in development

## Alternatives Considered

### TensorFlow + Keras

**Pros**: Production-ready (TF Serving), TPU support
**Cons**: Less flexible, declining research adoption, verbose API

### JAX + Flax

**Pros**: Functional programming, XLA compilation
**Cons**: Smaller ecosystem, less geospatial library support

## References

- [PyTorch Lightning Documentation](https://lightning.ai/docs/pytorch/)
- [EfficientNet Paper](https://arxiv.org/abs/1905.11946)
- [DeepLabV3+ Paper](https://arxiv.org/abs/1802.02611)
- [Segmentation Models PyTorch](https://github.com/qubvel/segmentation_models.pytorch)
- [MDPI 2025 Yield Prediction Study](https://doi.org/10.3390/agriculture-94-1-26)

## Revision History

- 2025-01-16: Initial draft (Accepted)
