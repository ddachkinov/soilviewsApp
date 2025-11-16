# SoilViews UI/UX Workflow & User Journey

**Comprehensive guide for end-user interactions with the platform**

---

## Table of Contents

1. [User Personas](#user-personas)
2. [Core User Flows](#core-user-flows)
3. [Soil Analysis Request Workflow](#soil-analysis-request-workflow)
4. [Bulgarian Cadastre (KAIS) Integration](#bulgarian-cadastre-kais-integration)
5. [Map Drawing & Field Selection](#map-drawing--field-selection)
6. [Background Processing & Notifications](#background-processing--notifications)
7. [UI Components](#ui-components)
8. [Wireframes](#wireframes)

---

## User Personas

### 1. Farmer (Ivan, 45, Parvomay)
- **Goal**: Get soil analysis for 50 ha wheat field
- **Tech Savvy**: Medium (uses smartphone, Facebook)
- **Language**: Bulgarian (prefers Bulgarian interface)
- **Pain Points**: Doesn't know exact parcel boundaries, wants simple process

### 2. Agronomist (Maria, 32, Sofia)
- **Goal**: Manage soil data for 20 client farms
- **Tech Savvy**: High (uses GIS software, Excel)
- **Language**: Bilingual (bg/en)
- **Pain Points**: Needs batch processing, CSV export, API integration

### 3. Insurance Agent (Georgi, 38, Plovdiv)
- **Goal**: Assess field-level risk for crop insurance
- **Tech Savvy**: Medium-High
- **Language**: Bulgarian
- **Pain Points**: Needs quick turnaround, anomaly detection

---

## Core User Flows

### Flow 1: New User Onboarding

```
1. Landing Page → 2. Register → 3. Email Verification →
4. Onboarding Wizard (Organization, Fields) → 5. Dashboard
```

**Duration**: 5 minutes

**Key Screens**:
- Welcome screen with value proposition
- Registration form (email, password, name, organization)
- Email verification with link
- Interactive tutorial (optional skip)
- Dashboard with empty state (call-to-action: "Add Your First Field")

---

### Flow 2: Add Field via Cadastre (KAIS)

```
1. Click "Add Field" → 2. Select "Import from Cadastre" →
3. Enter Cadastre ID → 4. Fetch from KAIS → 5. Review & Confirm →
6. Field Added ✅
```

**Duration**: 2 minutes

**UI Components**:
- Search input: "Cadastre Identifier (e.g., 58761.34.12)"
- Loading spinner: "Fetching data from KAIS..."
- Preview card: Field name, area (ha), municipality, map preview
- "Confirm & Import" button

**Backend Requirements**:
- KAIS API integration (if available) OR
- Shapefile upload from KAIS export
- Coordinate transformation (KAIS uses BGS2005 → WGS84 conversion)

---

### Flow 3: Add Field via Map Drawing

```
1. Click "Add Field" → 2. Select "Draw on Map" →
3. Draw Polygon (MapLibre drawing tools) → 4. Finish Drawing →
5. Enter Field Details (name, crop) → 6. Save Field ✅
```

**Duration**: 3-5 minutes

**UI Components**:
- MapLibre GL JS with drawing plugin (`@maplibre/maplibre-gl-draw`)
- Drawing tools: Polygon, Rectangle, Delete
- Snap-to-grid: 10 m resolution (Sentinel-2 pixel size)
- Area calculator: Display area in hectares as user draws
- Form: Field name, crop type, crop year

**Example Code**:
```typescript
import MapLibreDraw from '@maplibre/maplibre-gl-draw';

const draw = new MapLibreDraw({
  displayControlsDefault: false,
  controls: {
    polygon: true,
    trash: true
  }
});

map.addControl(draw);

// When user finishes drawing
map.on('draw.create', (e) => {
  const polygon = e.features[0];
  const areaHa = turf.area(polygon) / 10000;  // Convert m² to hectares
  setFieldArea(areaHa.toFixed(2));
});
```

---

## Soil Analysis Request Workflow

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Select Field or Draw Area                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Option A: Select Existing Field                           │
│  [Dropdown: My Fields ▼] → Select "North Field (50 ha)"    │
│                                                             │
│  Option B: Draw New Area                                   │
│  [Map with Drawing Tools] → Draw polygon → Calculate area  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Request Analysis Type                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ☑ Soil Property Map (pH, OM, N, P, K)                     │
│  ☑ VRA Prescription (for wheat/sunflower/maize)            │
│  ☐ Insurance Risk Assessment                               │
│                                                             │
│  Date Range: [2024-03-15] to [2024-04-30]                  │
│  (Bare-soil window for best results)                       │
│                                                             │
│  [Request Analysis] ← Primary CTA                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Confirmation Modal                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Analysis Request Summary                                   │
│  ─────────────────────────────────────────────              │
│  Field: North Field                                         │
│  Area: 50 ha                                                │
│  Analysis: Soil Map + VRA Prescription                      │
│  Estimated Time: 3-5 minutes                                │
│  Cost: €1.25 (€0.025/ha)                                    │
│                                                             │
│  ⚡ Processing will start immediately                       │
│  📧 You'll be notified via email when ready                 │
│                                                             │
│  [Cancel]  [Confirm & Process] ← Green button              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Background Processing (Queue System)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Job Created: ID #12345                                     │
│  Status: QUEUED → PROCESSING → COMPLETED                   │
│                                                             │
│  Backend Tasks:                                             │
│  1. ✅ Fetch Sentinel-2 imagery (Sentinel Hub API)         │
│  2. ✅ Upload COG to S3                                     │
│  3. ⏳ Run ML inference (AWS Lambda)                        │
│  4. ⏸ Generate VRA prescription                            │
│  5. ⏸ Send notification                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Real-Time Status Updates (WebSocket or Polling)    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Dashboard] → Analysis in Progress Section                 │
│                                                             │
│  North Field - Soil Analysis                                │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░ 60%                                      │
│  Status: Running ML inference...                            │
│  Started: 2 minutes ago                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Notification (Email + In-App)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📧 Email Subject: "Your soil analysis is ready!"          │
│  ────────────────────────────────────────────────────       │
│  Hi Ivan,                                                   │
│                                                             │
│  Your soil analysis for North Field (50 ha) is complete:   │
│                                                             │
│  • Soil Property Map (pH, OM, N, P, K)                      │
│  • VRA Prescription for Wheat                               │
│                                                             │
│  View Results: https://app.soilviews.bg/maps/map-uuid      │
│                                                             │
│  🔔 In-App Notification (Bell Icon):                        │
│  "North Field analysis complete - View Results →"           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: View Results (Interactive Map)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [MapLibre GL JS Viewer]                                    │
│  ┌───────────────────────────────────────────────┐         │
│  │                                               │         │
│  │         🗺️ Interactive Soil Map              │         │
│  │                                               │         │
│  │  Legend:                                      │         │
│  │  pH:  4.5 ── 5.5 ── 6.5 ── 7.5 ── 8.5        │         │
│  │       🟥   🟧   🟨   🟩   🟦                  │         │
│  │                                               │         │
│  │  Layer Switcher:                              │         │
│  │  ○ pH  ○ Organic Matter  ○ Nitrogen          │         │
│  │  ● Phosphorus  ○ Potassium  ○ Clay%          │         │
│  │                                               │         │
│  └───────────────────────────────────────────────┘         │
│                                                             │
│  [Download] ▼                                               │
│  • Soil Map (GeoTIFF)                                       │
│  • VRA Prescription (Shapefile)                             │
│  • VRA Prescription (ISO 11783 XML)                         │
│  • Summary Report (PDF)                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Estimated Timeline

| Step | Duration | User Action | System Action |
|------|----------|-------------|---------------|
| 1. Select Field | 30 sec | Choose field or draw area | Validate geometry |
| 2. Request Analysis | 20 sec | Select options, confirm | Create job in queue |
| 3. Processing | 3-5 min | Wait (can close browser) | Fetch data, run ML, generate outputs |
| 4. Notification | Instant | Receive email/app notification | Send via SendGrid/SES |
| 5. View Results | 2 min | Explore map, download files | Serve tiles via TiTiler |
| **Total** | **6-8 min** | | |

---

## Bulgarian Cadastre (KAIS) Integration

### What is KAIS?

**KAIS** = **K**adaster **I**nformation **S**ystem (Bulgarian: Кадастър)
- Official land registry for Bulgaria
- URL: https://kais.cadastre.bg
- Manages: Parcel boundaries, ownership, land use

### Integration Strategy

#### Option 1: Official API (if available)

**Pros**: Real-time data, authoritative source
**Cons**: Requires API access agreement with Bulgarian Geodesy Agency

**Implementation**:
```typescript
// api/src/cadastre/kais.service.ts
import axios from 'axios';

@Injectable()
export class KaisService {
  private readonly KAIS_API_URL = 'https://kais.cadastre.bg/api/v1';

  async getParcelByIdentifier(cadastreId: string): Promise<KaisParcel> {
    const response = await axios.get(`${this.KAIS_API_URL}/parcels/${cadastreId}`, {
      headers: { 'Authorization': `Bearer ${process.env.KAIS_API_KEY}` }
    });

    return {
      id: response.data.id,
      identifier: response.data.cadastre_id,
      geometry: this.transformCoordinates(response.data.geometry), // BGS2005 → WGS84
      area: response.data.area_sqm / 10000, // m² → hectares
      municipality: response.data.municipality,
      landUse: response.data.land_use,
    };
  }

  // Transform from Bulgarian Geodetic System 2005 (EPSG:7801) to WGS84 (EPSG:4326)
  private transformCoordinates(geometry: any) {
    const proj4 = require('proj4');
    proj4.defs('EPSG:7801', '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

    // Transform coordinates...
    return transformedGeometry;
  }
}
```

#### Option 2: Manual Export Import (Interim Solution)

**User Workflow**:
1. User logs into https://kais.cadastre.bg
2. Searches for their parcel by cadastre ID
3. Exports parcel as Shapefile/KML
4. Uploads file to SoilViews

**Implementation**:
```typescript
@Post('import/cadastre-file')
@UseInterceptors(FileInterceptor('file'))
async importCadastreFile(@UploadedFile() file: Express.Multer.File, @CurrentUser() user) {
  // Parse Shapefile or KML
  const parcels = await this.parseGeospatialFile(file.buffer, file.mimetype);

  // Create fields from parcels
  const fields = parcels.map(parcel => this.fieldsService.create({
    name: parcel.cadastreId,
    geometry: parcel.geometry,
    organizationId: user.organizationId,
    metadata: { source: 'KAIS', cadastreId: parcel.cadastreId }
  }));

  return { imported: fields.length };
}
```

### Cadastre ID Format

**Bulgarian Cadastre Identifier Structure**:
```
XXXXX.YY.ZZZ
│     │  │
│     │  └── Parcel number within property
│     └──── Property number within municipality
└────────── EKATTE code (municipality identifier)

Example: 58761.34.12
- 58761 = Parvomay municipality (EKATTE code)
- 34 = Property #34
- 12 = Parcel #12 within property
```

**Validation Regex**:
```typescript
const CADASTRE_ID_REGEX = /^\d{5}\.\d{1,3}\.\d{1,4}$/;

function validateCadastreId(id: string): boolean {
  return CADASTRE_ID_REGEX.test(id);
}
```

---

## Map Drawing & Field Selection

### Drawing Tools (MapLibre GL Draw)

**Installation**:
```bash
pnpm add @maplibre/maplibre-gl-draw
```

**Component Implementation**:
```typescript
// packages/web/src/components/FieldDrawer.tsx
import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import MapLibreDraw from '@maplibre/maplibre-gl-draw';
import * as turf from '@turf/turf';

export function FieldDrawer({ onFieldDrawn }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const draw = useRef(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [25.4858, 42.7339], // Bulgaria center
      zoom: 7,
    });

    // Add drawing controls
    draw.current = new MapLibreDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      styles: [
        // Active polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          paint: {
            'fill-color': '#22c55e',
            'fill-opacity': 0.3,
          },
        },
        // Active polygon outline
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          paint: {
            'line-color': '#16a34a',
            'line-width': 2,
          },
        },
      ],
    });

    map.current.addControl(draw.current);

    // Listen for completed drawings
    map.current.on('draw.create', handleDrawComplete);
    map.current.on('draw.update', handleDrawComplete);

    return () => {
      map.current?.off('draw.create', handleDrawComplete);
      map.current?.off('draw.update', handleDrawComplete);
      map.current?.remove();
    };
  }, []);

  const handleDrawComplete = (e) => {
    const feature = e.features[0];
    const polygon = feature.geometry;

    // Calculate area in hectares
    const area = turf.area(polygon) / 10000;

    // Validate minimum area (e.g., 0.1 ha)
    if (area < 0.1) {
      alert('Field must be at least 0.1 hectares');
      draw.current.delete(feature.id);
      return;
    }

    // Validate maximum area (e.g., 1000 ha)
    if (area > 1000) {
      alert('Field cannot exceed 1000 hectares');
      draw.current.delete(feature.id);
      return;
    }

    // Pass to parent component
    onFieldDrawn({
      geometry: polygon,
      areaHectares: area.toFixed(2),
    });
  };

  return (
    <div>
      <div ref={mapContainer} style={{ height: '600px' }} />
      <div className="mt-4 text-sm text-gray-600">
        Click on the map to start drawing your field boundary.
        Double-click to finish.
      </div>
    </div>
  );
}
```

### Snap-to-Grid Feature

**Why**: Align drawn polygons to 10 m Sentinel-2 pixel grid

```typescript
function snapCoordinatesToGrid(coordinates: number[][], gridSize: number = 0.0001) {
  // gridSize = 0.0001° ≈ 10 m at 42°N latitude
  return coordinates.map(ring =>
    ring.map(([lon, lat]) => [
      Math.round(lon / gridSize) * gridSize,
      Math.round(lat / gridSize) * gridSize,
    ])
  );
}
```

---

## Background Processing & Notifications

### Job Queue Architecture

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   API Server     │──────▶│   Redis Queue    │──────▶│  Worker Pods     │
│  (NestJS)        │      │    (Bull)         │      │ (Background)      │
│                  │      │                  │      │                  │
│ Create Job ──────┤      │ ┌──────────────┐ │      │ Process Jobs:    │
│ Status Check ────┤      │ │ soil-analysis │ │      │ 1. Fetch Sentinel│
│                  │      │ │ Queue         │ │      │ 2. Run ML        │
└──────────────────┘      │ └──────────────┘ │      │ 3. Generate VRA  │
                          │                  │      │ 4. Send Email    │
                          └──────────────────┘      └──────────────────┘
```

**Implementation**:

```typescript
// api/src/jobs/soil-analysis.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('soil-analysis')
export class SoilAnalysisProcessor {
  @Process('generateSoilMap')
  async handleSoilMapGeneration(job: Job) {
    const { fieldId, dateRange, userId } = job.data;

    try {
      // Update job progress
      await job.progress(10);

      // Step 1: Fetch Sentinel-2 data
      const sentinel2Url = await this.sentinelHubService.fetchComposite(fieldId, dateRange);
      await job.progress(30);

      // Step 2: Upload to S3
      const cogUrl = await this.s3Service.uploadCOG(sentinel2Url);
      await job.progress(50);

      // Step 3: Run ML inference (Lambda)
      const predictions = await this.lambdaService.invokeInference(cogUrl, fieldId);
      await job.progress(70);

      // Step 4: Save soil map
      const soilMap = await this.mapsService.create({
        fieldId,
        cogUrl: predictions.cogUrl,
        metadata: predictions.metadata,
      });
      await job.progress(90);

      // Step 5: Send notification
      await this.notificationService.send(userId, {
        type: 'SOIL_MAP_READY',
        data: { mapId: soilMap.id, fieldId },
      });
      await job.progress(100);

      return { success: true, mapId: soilMap.id };
    } catch (error) {
      // Handle error, send failure notification
      await this.notificationService.send(userId, {
        type: 'SOIL_MAP_FAILED',
        data: { error: error.message },
      });
      throw error;
    }
  }
}
```

### Real-Time Status Updates

**Option 1: WebSocket (Recommended)**

```typescript
// api/src/jobs/jobs.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class JobsGateway {
  @WebSocketServer()
  server: Server;

  emitJobProgress(userId: string, jobId: string, progress: number) {
    this.server.to(`user-${userId}`).emit('job-progress', {
      jobId,
      progress,
      timestamp: new Date(),
    });
  }

  emitJobComplete(userId: string, jobId: string, result: any) {
    this.server.to(`user-${userId}`).emit('job-complete', {
      jobId,
      result,
      timestamp: new Date(),
    });
  }
}
```

**Frontend (React)**:
```typescript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function JobProgressTracker({ jobId }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('QUEUED');

  useEffect(() => {
    const socket = io('http://localhost:3000', {
      auth: { token: localStorage.getItem('accessToken') },
    });

    socket.on('job-progress', (data) => {
      if (data.jobId === jobId) {
        setProgress(data.progress);
      }
    });

    socket.on('job-complete', (data) => {
      if (data.jobId === jobId) {
        setStatus('COMPLETED');
        setProgress(100);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [jobId]);

  return (
    <div>
      <div className="progress-bar" style={{ width: `${progress}%` }} />
      <p>Status: {status} ({progress}%)</p>
    </div>
  );
}
```

**Option 2: Polling (Fallback)**

```typescript
// Poll job status every 5 seconds
const pollJobStatus = async (jobId: string) => {
  const interval = setInterval(async () => {
    const status = await fetch(`/api/jobs/${jobId}/status`).then(r => r.json());

    setProgress(status.progress);

    if (status.state === 'completed' || status.state === 'failed') {
      clearInterval(interval);
    }
  }, 5000);
};
```

### Email Notifications

**Template**: Soil Analysis Ready

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .header { background: #16a34a; color: white; padding: 20px; }
    .content { padding: 20px; }
    .button { background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌾 Your Soil Analysis is Ready!</h1>
  </div>
  <div class="content">
    <p>Hi {{firstName}},</p>

    <p>Great news! Your soil analysis for <strong>{{fieldName}}</strong> ({{areaHa}} ha) is complete.</p>

    <h3>Results Available:</h3>
    <ul>
      <li>✅ Soil Property Map (pH, Organic Matter, N/P/K)</li>
      <li>✅ VRA Prescription for {{cropType}}</li>
      <li>✅ Summary Report (PDF)</li>
    </ul>

    <p>
      <a href="{{viewResultsUrl}}" class="button">View Results →</a>
    </p>

    <p style="color: #666; font-size: 12px;">
      This analysis used Sentinel-2 satellite imagery from {{dateRange}} and our AI model trained on 5,000+ Bulgarian soil samples (R² = 0.78).
    </p>
  </div>
</body>
</html>
```

---

## UI Components

### 1. Field Selector Dropdown

```typescript
// packages/web/src/components/FieldSelector.tsx
import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/ui/select';

export function FieldSelector({ onChange }) {
  const { data: fields } = useQuery(['fields'], fetchFields);

  return (
    <Select onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a field..." />
      </SelectTrigger>
      <SelectContent>
        {fields?.map(field => (
          <SelectItem key={field.id} value={field.id}>
            {field.name} ({field.areaHectares} ha)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 2. Analysis Request Form

```typescript
export function AnalysisRequestForm({ field }) {
  const [analysisTypes, setAnalysisTypes] = useState(['soilMap']);
  const [dateRange, setDateRange] = useState({
    start: '2024-03-15',
    end: '2024-04-30',
  });

  const handleSubmit = async () => {
    const response = await fetch('/api/analysis/request', {
      method: 'POST',
      body: JSON.stringify({
        fieldId: field.id,
        analysisTypes,
        dateRange,
      }),
    });

    const job = await response.json();
    // Navigate to job progress page
    navigate(`/jobs/${job.id}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Request Analysis for {field.name}</h3>

      <label>
        <input
          type="checkbox"
          checked={analysisTypes.includes('soilMap')}
          onChange={() => toggleAnalysisType('soilMap')}
        />
        Soil Property Map
      </label>

      <label>
        <input
          type="checkbox"
          checked={analysisTypes.includes('vraPrescription')}
          onChange={() => toggleAnalysisType('vraPrescription')}
        />
        VRA Prescription
      </label>

      <button type="submit">Request Analysis</button>
    </form>
  );
}
```

### 3. Interactive Map Viewer

```typescript
export function SoilMapViewer({ mapId }) {
  const [activeLayer, setActiveLayer] = useState('ph');

  return (
    <div>
      {/* Map */}
      <MapLibreMap
        initialViewState={{
          latitude: 42.7339,
          longitude: 25.4858,
          zoom: 14,
        }}
      >
        <Source
          id="soil-map"
          type="raster"
          tiles={[
            `https://tiles.soilviews.bg/cog/tiles/{z}/{x}/{y}.png?url=s3://soilviews-cogs/map-${mapId}-${activeLayer}.tif`,
          ]}
        />
        <Layer id="soil-map-layer" type="raster" source="soil-map" />
      </MapLibreMap>

      {/* Layer Switcher */}
      <div className="layer-switcher">
        <button onClick={() => setActiveLayer('ph')}>pH</button>
        <button onClick={() => setActiveLayer('om')}>Organic Matter</button>
        <button onClick={() => setActiveLayer('n')}>Nitrogen</button>
      </div>
    </div>
  );
}
```

---

## Wireframes

### Home Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│ SoilViews                           🔔 2   [Ivan] ▼   🇧🇬/🇬🇧 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Dashboard                                                     │
│  ────────────────────────────────────────────────────────     │
│                                                                │
│  📊 Quick Stats                                                │
│  ┌──────────────┬──────────────┬──────────────┐              │
│  │ Total Fields │ Total Area   │ Analyses     │              │
│  │     12       │   520 ha     │      8       │              │
│  └──────────────┴──────────────┴──────────────┘              │
│                                                                │
│  🗺️ Recent Analyses                                           │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ North Field (50 ha)                          READY  │     │
│  │ Soil Map + VRA Prescription                         │     │
│  │ Completed: 5 min ago                [View Results →]│     │
│  ├─────────────────────────────────────────────────────┤     │
│  │ South Field (30 ha)                      PROCESSING │     │
│  │ Soil Map                                            │     │
│  │ ▓▓▓▓▓▓▓▓▓░░░░░░░ 60%                               │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                                │
│  [+ Request New Analysis]                                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Summary

**Key Takeaways**:
1. ✅ **Two field input methods**: KAIS integration OR manual map drawing
2. ✅ **Simple 3-click workflow**: Select field → Request analysis → View results
3. ✅ **Background processing**: Users can close browser, get notified when ready
4. ✅ **Real-time updates**: WebSocket or polling for job progress
5. ✅ **Multi-channel notifications**: Email + in-app bell icon
6. ✅ **Interactive results**: MapLibre viewer with layer switching

**Estimated Development Time**:
- KAIS integration: 2-3 weeks (with API access) or 1 week (file upload only)
- Map drawing UI: 1 week
- Job queue + notifications: 1 week
- Results viewer: 1 week

**Total**: 4-6 weeks for complete UI/UX implementation

---

**Next Steps**: Implement frontend components using this specification.
