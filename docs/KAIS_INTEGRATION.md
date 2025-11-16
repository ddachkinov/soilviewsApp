# Bulgarian Cadastre (KAIS) Open Data Integration

**Complete guide for integrating Bulgarian cadastral data into SoilViews**

---

## Overview

**KAIS** (Cadastre Information System) provides open data for Bulgarian land parcels.
- **URL**: https://kais.cadastre.bg/en/OpenData
- **Authority**: Agency for Geodesy, Cartography and Cadastre
- **Data Format**: Shapefile, DXF, GML
- **Update Frequency**: Regular updates
- **Cost**: FREE (open data)

---

## Available Open Data

### 1. Cadastral Parcels

**What**: Boundary polygons for all registered land parcels in Bulgaria

**File Format**: Shapefile (.shp)
**Coordinate System**: BGS 2005 / UTM Zone 35N (EPSG:7801)
**Attributes**:
- `cadastre_id` - Unique identifier (e.g., "58761.34.12")
- `municipality` - Municipality name (EKATTE code)
- `area_sqm` - Area in square meters
- `land_use` - Land use category
- `owner_type` - Ownership type (private, state, municipal)

**Download Structure**:
```
KAIS_OpenData/
├── Bulgaria_Cadastre_2024_Q1/
│   ├── Sofia/
│   │   ├── cadastre_sofia.shp
│   │   ├── cadastre_sofia.shx
│   │   ├── cadastre_sofia.dbf
│   │   └── cadastre_sofia.prj
│   ├── Plovdiv/
│   │   └── cadastre_plovdiv.*
│   └── ... (other municipalities)
```

### 2. Administrative Boundaries

- Municipality boundaries
- District (oblast) boundaries
- Settlement boundaries

### 3. Topographic Data (optional)

- Roads
- Water bodies
- Building footprints

---

## Integration Strategy

### Phase 1: Manual Import (Immediate - 1 week)

**User Workflow**:

```
1. User visits https://kais.cadastre.bg/en/OpenData
2. Downloads shapefile for their municipality (e.g., Parvomay)
3. Uploads to SoilViews via "Import Cadastre Data" button
4. System processes shapefile and creates fields
```

**Backend Implementation**:

```typescript
// packages/api/src/cadastre/cadastre.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import shapefile from 'shapefile';
import proj4 from 'proj4';

@Injectable()
export class CadastreService {
  constructor(private fieldsService: FieldsService) {
    // Define Bulgarian coordinate system (BGS 2005 / UTM Zone 35N)
    proj4.defs(
      'EPSG:7801',
      '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    );
  }

  /**
   * Import cadastral parcels from shapefile.
   *
   * @param shpBuffer - Shapefile buffer (.shp file)
   * @param dbfBuffer - DBF buffer (attributes)
   * @param organizationId - Target organization
   * @returns Number of parcels imported
   */
  async importShapefile(
    shpBuffer: Buffer,
    dbfBuffer: Buffer,
    organizationId: string
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    // Open shapefile
    const source = await shapefile.open(shpBuffer, dbfBuffer);

    let result = await source.read();
    while (!result.done) {
      const feature = result.value;

      try {
        // Extract attributes
        const cadastreId = feature.properties.cadastre_id || feature.properties.CADASTRE_ID;
        const areaSquareMeters = feature.properties.area_sqm || feature.properties.AREA_SQM;
        const municipality = feature.properties.municipality || feature.properties.MUNICIPALITY;

        // Transform geometry from BGS2005 to WGS84
        const wgs84Geometry = this.transformGeometry(feature.geometry);

        // Create field
        await this.fieldsService.create(
          {
            name: `Parcel ${cadastreId}`,
            geometry: wgs84Geometry,
            municipality,
            lpisId: cadastreId, // Store cadastre ID in lpisId field
            metadata: {
              source: 'KAIS_OpenData',
              importDate: new Date(),
              originalArea: areaSquareMeters,
            },
          },
          organizationId
        );

        imported++;
      } catch (error) {
        console.error(`Failed to import parcel: ${error.message}`);
        skipped++;
      }

      result = await source.read();
    }

    return { imported, skipped };
  }

  /**
   * Transform geometry from BGS2005 to WGS84.
   *
   * @param geometry - GeoJSON geometry in BGS2005
   * @returns GeoJSON geometry in WGS84
   */
  private transformGeometry(geometry: any): any {
    if (geometry.type === 'Polygon') {
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring: number[][]) =>
          ring.map(([x, y]) => {
            // Transform from BGS2005 (EPSG:7801) to WGS84 (EPSG:4326)
            const [lon, lat] = proj4('EPSG:7801', 'EPSG:4326', [x, y]);
            return [lon, lat];
          })
        ),
      };
    }

    // Handle MultiPolygon if needed
    return geometry;
  }
}
```

**Controller**:

```typescript
// packages/api/src/cadastre/cadastre.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CadastreService } from './cadastre.service';

@ApiTags('cadastre')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('cadastre')
export class CadastreController {
  constructor(private readonly cadastreService: CadastreService) {}

  @Post('import/shapefile')
  @ApiOperation({ summary: 'Import cadastral data from KAIS shapefile' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'shp', maxCount: 1 },
      { name: 'dbf', maxCount: 1 },
      { name: 'shx', maxCount: 1 },
      { name: 'prj', maxCount: 1 },
    ])
  )
  async importShapefile(
    @UploadedFiles()
    files: {
      shp?: Express.Multer.File[];
      dbf?: Express.Multer.File[];
      shx?: Express.Multer.File[];
      prj?: Express.Multer.File[];
    },
    @CurrentUser() user
  ) {
    if (!files.shp || !files.dbf) {
      throw new BadRequestException('Both .shp and .dbf files are required');
    }

    const result = await this.cadastreService.importShapefile(
      files.shp[0].buffer,
      files.dbf[0].buffer,
      user.organizationId
    );

    return {
      message: `Successfully imported ${result.imported} parcels (${result.skipped} skipped)`,
      imported: result.imported,
      skipped: result.skipped,
    };
  }
}
```

**Frontend Upload Component**:

```typescript
// packages/web/src/components/CadastreImporter.tsx
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

export function CadastreImporter() {
  const [files, setFiles] = useState<{ shp?: File; dbf?: File; shx?: File }>({});
  const [importing, setImporting] = useState(false);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/octet-stream': ['.shp', '.dbf', '.shx', '.prj'],
    },
    onDrop: (acceptedFiles) => {
      const newFiles = { ...files };
      acceptedFiles.forEach((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'shp' || ext === 'dbf' || ext === 'shx' || ext === 'prj') {
          newFiles[ext] = file;
        }
      });
      setFiles(newFiles);
    },
  });

  const handleImport = async () => {
    if (!files.shp || !files.dbf) {
      alert('Please upload both .shp and .dbf files');
      return;
    }

    setImporting(true);

    const formData = new FormData();
    formData.append('shp', files.shp);
    formData.append('dbf', files.dbf);
    if (files.shx) formData.append('shx', files.shx);
    if (files.prj) formData.append('prj', files.prj);

    try {
      const response = await fetch('/api/cadastre/import/shapefile', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      const result = await response.json();
      alert(`✅ Imported ${result.imported} parcels!`);
      setFiles({});
    } catch (error) {
      alert(`❌ Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">Import from Bulgarian Cadastre (KAIS)</h3>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          1. Visit{' '}
          <a
            href="https://kais.cadastre.bg/en/OpenData"
            target="_blank"
            className="text-green-600 underline"
          >
            KAIS Open Data
          </a>
        </p>
        <p className="text-sm text-gray-600 mb-2">
          2. Download shapefile for your municipality
        </p>
        <p className="text-sm text-gray-600">3. Upload all files (.shp, .dbf, .shx, .prj)</p>
      </div>

      <div
        {...getRootProps()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500"
      >
        <input {...getInputProps()} />
        <p className="text-gray-600">Drag and drop files here, or click to select</p>
      </div>

      {/* File list */}
      <div className="mt-4">
        {Object.entries(files).map(([ext, file]) => (
          <div key={ext} className="flex items-center text-sm text-gray-700">
            <span className="text-green-600 mr-2">✓</span>
            {file.name}
          </div>
        ))}
      </div>

      <button
        onClick={handleImport}
        disabled={!files.shp || !files.dbf || importing}
        className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
      >
        {importing ? 'Importing...' : 'Import Parcels'}
      </button>
    </div>
  );
}
```

---

### Phase 2: Automated Sync (Future - 4-6 weeks)

**Approach**: Periodically download updated KAIS data and sync with SoilViews database.

**Implementation**:

```typescript
// Cron job to sync KAIS data monthly
@Cron('0 0 1 * *') // First day of each month at midnight
async syncKaisData() {
  // 1. Download latest KAIS shapefiles from official FTP/HTTP endpoint
  const municipalities = await this.getMunicipalityList();

  for (const municipality of municipalities) {
    const shapefileUrl = `https://kais.cadastre.bg/data/${municipality}/cadastre.zip`;

    // 2. Download and unzip
    const zipBuffer = await this.downloadFile(shapefileUrl);
    const files = await this.unzip(zipBuffer);

    // 3. Import new/updated parcels
    await this.importShapefile(files.shp, files.dbf, SYSTEM_ORG_ID);
  }

  // 4. Send notification to admins
  await this.notificationService.sendAdminEmail({
    subject: 'KAIS Data Sync Complete',
    message: `Updated cadastral data for ${municipalities.length} municipalities`,
  });
}
```

---

### Phase 3: Cadastre ID Lookup (Immediate - 1 week)

**User Workflow**:

```
1. User enters cadastre ID: "58761.34.12"
2. System searches local database (from Phase 1 import)
3. If found: Display parcel, allow selection
4. If not found: Prompt to upload shapefile
```

**Backend Search**:

```typescript
@Get('search/:cadastreId')
async searchByCadastreId(@Param('cadastreId') cadastreId: string, @CurrentUser() user) {
  // Validate format
  if (!/^\d{5}\.\d{1,3}\.\d{1,4}$/.test(cadastreId)) {
    throw new BadRequestException('Invalid cadastre ID format (expected: XXXXX.YY.ZZZ)');
  }

  // Search in fields (lpisId = cadastre ID)
  const field = await this.fieldsService.findByLpisId(cadastreId, user.organizationId);

  if (!field) {
    return {
      found: false,
      message: 'Cadastre ID not found in your organization. Please import from KAIS first.',
    };
  }

  return {
    found: true,
    field,
  };
}
```

**Frontend Component**:

```typescript
export function CadastreSearch({ onFieldSelected }) {
  const [cadastreId, setCadastreId] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    setSearching(true);

    try {
      const response = await fetch(`/api/cadastre/search/${cadastreId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (result.found) {
        onFieldSelected(result.field);
      } else {
        alert(result.message);
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <label>Cadastre ID (e.g., 58761.34.12)</label>
      <input
        type="text"
        value={cadastreId}
        onChange={(e) => setCadastreId(e.target.value)}
        placeholder="XXXXX.YY.ZZZ"
        pattern="^\d{5}\.\d{1,3}\.\d{1,4}$"
      />
      <button onClick={handleSearch} disabled={searching}>
        {searching ? 'Searching...' : 'Find Parcel'}
      </button>
    </div>
  );
}
```

---

## Coordinate System Transformation

**Bulgarian Systems**:

| System | EPSG Code | Usage |
|--------|-----------|-------|
| **BGS 2005 / UTM Zone 35N** | **7801** | **KAIS default** |
| BGS 2005 (Geographic) | 7798 | Lat/Lon in BGS datum |
| WGS 84 | 4326 | SoilViews standard |

**Transformation Library**:

```bash
pnpm add proj4
```

**Usage**:

```typescript
import proj4 from 'proj4';

// Define Bulgarian system
proj4.defs(
  'EPSG:7801',
  '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

// Transform point
const [lon, lat] = proj4('EPSG:7801', 'EPSG:4326', [690000, 4730000]);
// Result: [25.486, 42.734] (approximate)
```

---

## Data Quality Validation

**Checks to Implement**:

1. **Geometry Validation**: Ensure polygons are valid (no self-intersections)
2. **Area Validation**: Reject parcels < 0.01 ha or > 10,000 ha
3. **Coordinate Bounds**: Must be within Bulgaria (41.23-44.22°N, 22.36-28.61°E)
4. **Duplicate Detection**: Check if cadastre ID already exists

```typescript
private async validateParcel(cadastreId: string, geometry: any, organizationId: string) {
  // 1. Check for duplicates
  const existing = await this.fieldsService.findByLpisId(cadastreId, organizationId);
  if (existing) {
    throw new ConflictException(`Parcel ${cadastreId} already imported`);
  }

  // 2. Validate geometry
  const valid = turf.booleanValid(geometry);
  if (!valid) {
    throw new BadRequestException(`Invalid geometry for parcel ${cadastreId}`);
  }

  // 3. Check area
  const area = turf.area(geometry) / 10000; // hectares
  if (area < 0.01 || area > 10000) {
    throw new BadRequestException(`Area out of range: ${area.toFixed(2)} ha`);
  }

  // 4. Check bounds (within Bulgaria)
  const bbox = turf.bbox(geometry);
  const [minLon, minLat, maxLon, maxLat] = bbox;

  if (
    minLat < 41.23 || maxLat > 44.22 ||
    minLon < 22.36 || maxLon > 28.61
  ) {
    throw new BadRequestException('Parcel outside Bulgaria');
  }
}
```

---

## Performance Optimization

**Large Shapefile Handling** (100,000+ parcels):

1. **Batch Processing**: Insert in chunks of 1,000
2. **Transaction Management**: Use database transactions
3. **Background Job**: Process via Bull queue

```typescript
@Post('import/large')
async importLargeShapefile(@UploadedFiles() files, @CurrentUser() user) {
  // Create background job
  const job = await this.importQueue.add('import-cadastre', {
    shpBuffer: files.shp[0].buffer,
    dbfBuffer: files.dbf[0].buffer,
    organizationId: user.organizationId,
  });

  return {
    jobId: job.id,
    message: 'Import started in background. You will be notified when complete.',
  };
}
```

---

## User Guide (for farmers)

**Step-by-Step Instructions**:

1. **Visit KAIS Open Data Portal**
   - Go to: https://kais.cadastre.bg/en/OpenData
   - Select your municipality from the map
   - Download the ZIP file

2. **Extract Files**
   - Unzip the downloaded file
   - You should see 4 files: `.shp`, `.dbf`, `.shx`, `.prj`

3. **Upload to SoilViews**
   - Log in to SoilViews
   - Click "Fields" → "Import from Cadastre"
   - Drag and drop all 4 files (or click to select)
   - Click "Import"

4. **Wait for Processing**
   - Large files may take 1-2 minutes
   - You'll see progress indicator
   - Email notification when complete

5. **Select Your Parcels**
   - All parcels now appear in "My Fields"
   - Search by cadastre ID or name
   - Select parcels to analyze

---

## Cost & Performance

| Metric | Value |
|--------|-------|
| Average Shapefile Size (per municipality) | 5-50 MB |
| Processing Time (10,000 parcels) | ~2 minutes |
| Storage Cost (1M parcels in PostgreSQL) | ~500 MB = €0.01/month |
| API Call Cost | €0 (open data, no API fees) |

---

## Summary

✅ **KAIS Open Data is FREE** - no API costs!
✅ **Shapefile import is straightforward** - 1 week implementation
✅ **Coordinate transformation is simple** - proj4 library
✅ **User experience is seamless** - 3-click workflow

**Recommended Approach**:
1. **Phase 1** (Week 1): Implement manual shapefile upload
2. **Phase 2** (Week 2): Add cadastre ID search
3. **Phase 3** (Weeks 3-6): Automated monthly sync

**Priority**: HIGH - This significantly improves UX for Bulgarian farmers!

---

**Next Steps**: Implement `cadastre.service.ts` and `cadastre.controller.ts`.
