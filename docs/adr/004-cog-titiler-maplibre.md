# ADR-004: Cloud-Optimized GeoTIFFs with TiTiler and MapLibre GL JS

## Status

Accepted

## Context

SoilViews generates raster soil property maps that need to be:

1. **Stored efficiently** (10 m resolution for Bulgaria = 1.1 billion pixels per layer)
2. **Served dynamically** (zoom/pan without pre-generating 20+ zoom levels)
3. **Rendered in browser** (web-based map interface)
4. **Accessible via API** (for third-party integrations)

### Requirements

- **Coverage**: 110,993 km² (Bulgaria) at 10 m resolution
- **Layers**: pH, OM, N, P, K, Clay%, Sand%, Depth (8 layers)
- **Tile Response Time**: < 500 ms (P95)
- **Storage Cost**: < €0.02/ha/year
- **Format**: Must support partial reads (streaming)

### Options Considered

1. **Pre-rendered Tiles** (MBTiles, XYZ directories)
2. **WMS** (GeoServer, MapServer)
3. **Cloud-Optimized GeoTIFFs (COGs)** + dynamic tile server
4. **Vector Tiles** (MVT) - not applicable for rasters
5. **Zarr** (cloud-native array storage)

## Decision

We will use:

- **Storage Format**: **Cloud-Optimized GeoTIFFs (COGs)**
- **Tile Server**: **TiTiler** (FastAPI-based dynamic tiler)
- **Frontend Renderer**: **MapLibre GL JS** (WebGL raster + vector)
- **CDN**: **CloudFront** for tile caching

## Rationale

### Why Cloud-Optimized GeoTIFFs (COGs)?

**Standard GeoTIFF** requires downloading entire file to read a small region.
**COG** organizes data in tiles with overviews (pyramids), enabling **HTTP range
requests**.

**Structure**:

```
COG File Layout:
├── Header (IFD)
├── Overview Level 0 (full resolution, tiled)
├── Overview Level 1 (1/2 resolution)
├── Overview Level 2 (1/4 resolution)
└── ... (up to 1/256 resolution)

Each tile: 256×256 pixels, LZW or DEFLATE compressed
```

**Advantages**:

- ✅ **Partial Reads**: Fetch only tiles needed for viewport
- ✅ **Single File**: No database required (GeoTIFF is self-describing)
- ✅ **Standard**: GDAL-compatible, widely supported
- ✅ **S3-Native**: Range requests work directly on S3
- ✅ **Compression**: LZW reduces size by 3-5x

### Why TiTiler?

**TiTiler** is a FastAPI application that serves XYZ tiles from COGs in real-time.

**Features**:

- **Dynamic Tiling**: No pre-generation, tiles rendered on-demand
- **Colormap Application**: Apply color ramps to single-band rasters
- **Band Math**: NDVI, ratios, etc. computed on-the-fly
- **Rescaling**: Automatic histogram stretch
- **Format Support**: PNG, JPEG, WebP tiles
- **Caching**: Redis or CDN for frequently accessed tiles

**Comparison**:

| Solution         | Setup Time | Tile Speed | Storage  | Flexibility |
| ---------------- | ---------- | ---------- | -------- | ----------- |
| GeoServer (WMS)  | Hours      | 200-500 ms | Medium   | High        |
| Pre-rendered XYZ | Days       | 50 ms      | **Huge** | None        |
| **TiTiler + COG**| **Minutes**| **150 ms** | **Low**  | **High**    |

**Example TiTiler Request**:

```
GET /cog/tiles/WebMercatorQuad/12/2345/1234.png
  ?url=s3://soilviews-cogs/soil-ph-2024.tif
  &colormap_name=rdylgn
  &rescale=4,8
```

### Why MapLibre GL JS?

**MapLibre GL JS** is an open-source WebGL map renderer (fork of Mapbox GL JS v1).

**Advantages**:

- ✅ **WebGL Performance**: 60 fps rendering, smooth zoom/pan
- ✅ **Raster + Vector**: Display COG tiles + field boundaries simultaneously
- ✅ **Open Source**: No vendor lock-in (vs. Mapbox, Google Maps)
- ✅ **Small Bundle**: ~200 KB gzipped
- ✅ **Style Spec**: JSON-based styling (opacity, blending, filters)

**Example Integration**:

```typescript
import maplibregl from 'maplibre-gl';

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      'soil-ph': {
        type: 'raster',
        tiles: [
          'https://tiles.soilviews.bg/cog/tiles/{z}/{x}/{y}.png?url=s3://soilviews-cogs/soil-ph-2024.tif',
        ],
        tileSize: 256,
      },
      'field-boundaries': {
        type: 'vector',
        url: 'https://api.soilviews.bg/fields/{organizationId}/tiles.json',
      },
    },
    layers: [
      { id: 'soil-ph-layer', type: 'raster', source: 'soil-ph', paint: { 'raster-opacity': 0.7 } },
      {
        id: 'field-boundaries-layer',
        type: 'line',
        source: 'field-boundaries',
        paint: { 'line-color': '#000', 'line-width': 2 },
      },
    ],
  },
  center: [25.4858, 42.7339], // Bulgaria
  zoom: 7,
});
```

### Storage Cost Calculation

**Scenario**: 8 soil property layers, 110,993 km², 10 m resolution

- Pixels per layer: 110,993 km² / (10 m × 10 m) = **1.11 billion pixels**
- Uncompressed size (16-bit): 1.11 B × 2 bytes = **2.22 GB/layer**
- COG compressed (LZW, ~4x): 2.22 GB / 4 = **555 MB/layer**
- Total (8 layers): 555 MB × 8 = **4.44 GB**
- S3 Standard cost (eu-central-1): 4.44 GB × €0.023/GB/mo = **€0.10/month**
- Per hectare: €0.10 / 11,099,300 ha = **€0.000009/ha/month** ≈ **€0.0001/ha/year**

**Result**: Storage cost is negligible (< €0.01/ha/year).

## Implementation

### COG Generation (Python + GDAL)

```python
from osgeo import gdal

def create_cog(input_path, output_path):
    """Convert GeoTIFF to Cloud-Optimized GeoTIFF."""
    ds = gdal.Open(input_path)

    gdal.Translate(
        output_path,
        ds,
        format='COG',
        creationOptions=[
            'COMPRESS=LZW',
            'TILED=YES',
            'BLOCKSIZE=256',
            'OVERVIEWS=AUTO',
            'RESAMPLING=BILINEAR',
            'NUM_THREADS=ALL_CPUS',
        ],
    )

    print(f'COG created: {output_path}')
```

### TiTiler Deployment (Docker)

```dockerfile
FROM ghcr.io/developmentseed/titiler:latest

# Add custom colormaps
COPY colormaps/ /app/colormaps/

# Environment variables
ENV TITILER_CACHE_BACKEND=redis
ENV TITILER_REDIS_URL=redis://redis:6379
ENV TITILER_S3_ENDPOINT=https://s3.eu-central-1.amazonaws.com

EXPOSE 8000
CMD ["uvicorn", "titiler.application.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Layer Switcher (React + MapLibre)

```tsx
import { useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';

const SOIL_LAYERS = [
  { id: 'ph', name: 'Soil pH', colormap: 'rdylgn', rescale: '4,8' },
  { id: 'om', name: 'Organic Matter (%)', colormap: 'ylgn', rescale: '0,5' },
  { id: 'clay', name: 'Clay Content (%)', colormap: 'ylorbr', rescale: '10,50' },
];

export function MapComponent() {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [activeLayer, setActiveLayer] = useState('ph');

  useEffect(() => {
    const mapInstance = new maplibregl.Map({ /* config */ });
    setMap(mapInstance);

    // Add sources for all layers
    SOIL_LAYERS.forEach((layer) => {
      mapInstance.addSource(`soil-${layer.id}`, {
        type: 'raster',
        tiles: [
          `https://tiles.soilviews.bg/cog/tiles/{z}/{x}/{y}.png?url=s3://soilviews-cogs/soil-${layer.id}-2024.tif&colormap=${layer.colormap}&rescale=${layer.rescale}`,
        ],
      });
      mapInstance.addLayer({
        id: `soil-${layer.id}-layer`,
        type: 'raster',
        source: `soil-${layer.id}`,
        layout: { visibility: layer.id === activeLayer ? 'visible' : 'none' },
      });
    });
  }, []);

  const switchLayer = (layerId: string) => {
    SOIL_LAYERS.forEach((layer) => {
      map?.setLayoutProperty(
        `soil-${layer.id}-layer`,
        'visibility',
        layer.id === layerId ? 'visible' : 'none'
      );
    });
    setActiveLayer(layerId);
  };

  return (
    <div>
      <div id="map" style={{ width: '100%', height: '600px' }} />
      <LayerSwitcher layers={SOIL_LAYERS} active={activeLayer} onChange={switchLayer} />
    </div>
  );
}
```

## Consequences

### Positive

- ✅ **Zero Pre-processing**: No tile pyramid generation
- ✅ **Dynamic Styling**: Change colormaps without re-tiling
- ✅ **Low Storage**: Single COG vs. millions of PNG tiles
- ✅ **Fast Updates**: Replace COG file, tiles refresh instantly
- ✅ **Cost Effective**: €0.0001/ha/year storage, minimal compute

### Negative

- ❌ **Tile Generation Latency**: 150 ms vs. 50 ms for pre-rendered
- ❌ **CPU Usage**: TiTiler requires CPU for on-the-fly rendering
- ❌ **Cache Dependency**: High traffic requires Redis or CDN

### Mitigation

- **CloudFront CDN**: Cache tiles for 7 days (TTL = 604800 s)
- **Redis Tile Cache**: LRU cache for frequently accessed tiles
- **Horizontal Scaling**: Multiple TiTiler replicas behind load balancer

## Alternatives Considered

### Pre-rendered XYZ Tiles

**Pros**: Fastest tile delivery (50 ms)
**Cons**: Terabytes of storage, inflexible (can't change colormap), slow updates

### GeoServer WMS

**Pros**: Standard protocol, feature-rich
**Cons**: Heavyweight (Java), slower than TiTiler, complex configuration

### Zarr

**Pros**: Optimized for cloud, N-dimensional arrays
**Cons**: Not widely supported by GIS tools, overkill for 2D rasters

## References

- [Cloud-Optimized GeoTIFF Spec](https://www.cogeo.org/)
- [TiTiler Documentation](https://devseed.com/titiler/)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/api/)
- [GDAL COG Driver](https://gdal.org/drivers/raster/cog.html)

## Revision History

- 2025-01-16: Initial draft (Accepted)
