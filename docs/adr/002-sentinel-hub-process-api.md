# ADR-002: Sentinel-Hub Process API for Bare-Soil Mosaics

## Status

Accepted

## Context

SoilViews requires high-quality Sentinel-2 imagery (10 m resolution) to generate soil
property maps. We need to decide how to acquire, process, and mosaic Sentinel-2 data for
bare-soil conditions across Bulgaria.

### Requirements

1. **Temporal Compositing**: Multi-date mosaics to maximize bare-soil coverage
2. **Cloud Masking**: Automatic removal of clouds and shadows
3. **Atmospheric Correction**: L2A (Bottom-of-Atmosphere reflectance)
4. **Custom Band Math**: NDVI, bare-soil index calculations
5. **Output Format**: Cloud-Optimized GeoTIFFs (COGs)
6. **Coverage**: All of Bulgaria (110,993 km²)
7. **Cost**: < €0.01/ha per composite

### Options Considered

1. **ESA Copernicus Data Space Ecosystem** (free download, self-process)
2. **Google Earth Engine** (cloud processing, Sentinel-2 catalog)
3. **AWS Open Data (S3)** + custom processing pipeline
4. **Sentinel Hub Process API** (commercial, on-demand)
5. **Planet Labs** (commercial alternative)

## Decision

We will use **Sentinel Hub Process API** for on-demand bare-soil composite generation.

## Rationale

### Why Sentinel Hub?

1. **Process API**: Generate custom mosaics without downloading full scenes
2. **Built-in QA**: Scene classification layer (SCL) for cloud/shadow masking
3. **Temporal Aggregation**: Median/mean composites across date range
4. **Custom Scripts**: JavaScript evalscripts for band math (NDVI, BSI, etc.)
5. **Output Optimization**: Direct COG output with compression
6. **Pricing**: €0.10–0.25 per km² (processing units) → **€0.011–0.027/ha**
7. **Speed**: < 10 s for typical field (20 ha) composite

### Comparison with Alternatives

| Criteria              | ESA Free | GEE     | AWS Open | **Sentinel Hub** | Planet |
| --------------------- | -------- | ------- | -------- | ---------------- | ------ |
| Cost (€/ha)           | 0.000    | 0.000   | 0.005    | **0.020**        | 0.500  |
| Setup Complexity      | High     | Medium  | High     | **Low**          | Low    |
| Processing Time       | Hours    | Minutes | Hours    | **Seconds**      | N/A    |
| Custom Band Math      | Yes      | Limited | Yes      | **Yes**          | No     |
| COG Output            | Manual   | No      | Manual   | **Native**       | Yes    |
| Commercial Support    | No       | No      | No       | **Yes**          | Yes    |
| Resolution (Bulgaria) | 10 m     | 10 m    | 10 m     | **10 m**         | 3 m    |

**Decision**: Sentinel Hub offers the best balance of cost, speed, and ease of integration.

### Bare-Soil Composite Strategy

**Target Dates**: March 15 – April 30 (spring bare-soil window in Bulgaria)

**Evalscript Logic**:

```javascript
//VERSION=3
function setup() {
  return {
    input: ['B02', 'B03', 'B04', 'B08', 'B11', 'B12', 'SCL'],
    output: { bands: 8, sampleType: 'UINT16' },
    mosaicking: 'ORBIT',
  };
}

function evaluatePixel(samples) {
  // Filter: bare soil (SCL == 4, 5) OR low vegetation (SCL == 4)
  let bareSoilSamples = samples.filter((s) => [4, 5].includes(s.SCL));

  if (bareSoilSamples.length === 0) {
    return [0, 0, 0, 0, 0, 0, 0, 0]; // No valid pixels
  }

  // Median composite (reduces noise)
  let medianSample = bareSoilSamples[Math.floor(bareSoilSamples.length / 2)];

  return [
    medianSample.B02 * 10000, // Blue
    medianSample.B03 * 10000, // Green
    medianSample.B04 * 10000, // Red
    medianSample.B08 * 10000, // NIR
    medianSample.B11 * 10000, // SWIR1
    medianSample.B12 * 10000, // SWIR2
    medianSample.SCL,
    1, // Valid pixel flag
  ];
}
```

## Implementation

### API Integration (NestJS Service)

```typescript
@Injectable()
export class SentinelHubService {
  async fetchBareSoilComposite(
    bbox: [number, number, number, number],
    dateRange: [string, string],
    resolution: number = 10
  ): Promise<string> {
    const response = await this.httpService.post(
      'https://services.sentinel-hub.com/api/v1/process',
      {
        input: {
          bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/32635' } },
          data: [
            {
              type: 'sentinel-2-l2a',
              dataFilter: { timeRange: { from: dateRange[0], to: dateRange[1] } },
            },
          ],
        },
        output: {
          width: Math.ceil((bbox[2] - bbox[0]) / resolution),
          height: Math.ceil((bbox[3] - bbox[1]) / resolution),
          responses: [
            {
              identifier: 'default',
              format: { type: 'image/tiff' },
            },
          ],
        },
        evalscript: BARE_SOIL_EVALSCRIPT,
      },
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );

    // Upload to S3 as COG
    const cogKey = await this.storeCOG(response.data);
    return cogKey;
  }
}
```

### Cost Estimation

**Scenario**: 1,000,000 ha national coverage, 2 composites/year

- Area: 10,000 km²
- Processing Units: 10,000 km² × 2 composites × 0.1 PU/km² = **2,000 PU**
- Cost: 2,000 PU × €0.10/PU = **€200/year** → **€0.0002/ha/year**

**Actual cost is negligible** compared to compute/storage costs.

## Consequences

### Positive

- ✅ Rapid prototyping (no infrastructure for Sentinel-2 processing)
- ✅ Automatic updates (new Sentinel-2 scenes available within hours)
- ✅ Scalable (no need to manage petabytes of raw imagery)
- ✅ Reliable (99.9% uptime SLA)
- ✅ Custom evalscripts allow research-driven optimizations

### Negative

- ❌ Vendor lock-in (Sentinel Hub specific API)
- ❌ Ongoing costs (vs. one-time ESA download)
- ❌ Rate limits (need to batch large requests)

### Mitigation

- Abstract Sentinel Hub behind a generic `EarthObservationService` interface
- Implement fallback to AWS Open Data if Sentinel Hub unavailable
- Cache composites aggressively (S3 + CloudFront)

## Alternatives Considered

### Google Earth Engine (GEE)

**Pros**: Free, massive compute, built-in algorithms
**Cons**: JavaScript API (not Python/TypeScript native), export delays, less control

### AWS Open Data + GDAL

**Pros**: Free data, full control
**Cons**: High engineering effort, need to manage Sentinel-2 STAC catalog, slower

## References

- [Sentinel Hub Process API Docs](https://docs.sentinel-hub.com/api/latest/api/process/)
- [Sentinel-2 L2A Product Specification](https://sentinels.copernicus.eu/web/sentinel/user-guides/sentinel-2-msi/product-types/level-2a)
- [Bulgarian Bare-Soil Phenology Study](https://doi.org/10.3390/agriculture-15-15-1644)
- [Cloud-Optimized GeoTIFF Specification](https://www.cogeo.org/)

## Revision History

- 2025-01-16: Initial draft (Accepted)
