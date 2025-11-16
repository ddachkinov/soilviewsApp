# ADR-008: Apache Parquet for Ground-Truth Survey Exchange

## Status

Accepted

## Context

SoilViews ingests ground-truth soil survey data from multiple sources:

1. **Farmers**: Manual field measurements (pH meter, soil test kits)
2. **Agronomists**: Professional lab analysis (Carbonsafe, NIK Agro)
3. **Research Institutions**: National soil grid (Ministry of Agriculture)
4. **Third-Party APIs**: Integration with existing soil databases

### Requirements

- **Schema Validation**: Enforce ISO 28258 (Digital Exchange of Soil Data) + Bulgarian
  extensions
- **Column-Oriented**: Efficient analytics (e.g., "average pH by region")
- **Compression**: Minimize storage (10,000 surveys × 10 years = 100K records)
- **Interoperability**: Support Python, JavaScript/TypeScript, GDAL, QGIS
- **Metadata**: Embedded schema, units, coordinate system
- **Append-Friendly**: Add new surveys without rewriting entire dataset
- **Cloud-Native**: S3-compatible, partial reads

### Options Considered

1. **CSV** (plain text, simple)
2. **JSON/GeoJSON** (human-readable, geospatial)
3. **Shapefile** (GIS standard, legacy)
4. **GeoPackage** (SQLite-based, OGC standard)
5. **Apache Parquet** (columnar, analytics-optimized)
6. **FlatGeobuf** (streaming geospatial format)

## Decision

We will use **Apache Parquet** for ground-truth survey exchange and archival storage.

**Specification**:

- **Base Schema**: ISO 28258:2013 (Soil Quality - Digital Exchange)
- **Extensions**: Bulgarian-specific fields (e.g., `district`, `municipality`)
- **Geometry**: WKB (Well-Known Binary) in BINARY column
- **Coordinate System**: EPSG:4326 (WGS84) mandatory
- **Compression**: Snappy (fast) or ZSTD (better ratio)

## Rationale

### Comparison of Formats

| Format         | Size (100K rows) | Read Speed | Write Speed | Analytics | Schema | Geo Support | Choice      |
| -------------- | ---------------- | ---------- | ----------- | --------- | ------ | ----------- | ----------- |
| CSV            | 50 MB            | Fast       | Fast        | Poor      | None   | None        | No          |
| JSON           | 120 MB           | Slow       | Medium      | Poor      | None   | Manual      | No          |
| Shapefile      | 40 MB            | Medium     | Medium      | Poor      | DBF    | ✅          | Legacy only |
| GeoPackage     | 35 MB            | Medium     | Slow        | Medium    | SQLite | ✅          | Alternative |
| **Parquet**    | **15 MB**        | **Fast**   | **Fast**    | **✅**    | **✅** | **WKB**     | **Selected**|
| FlatGeobuf     | 30 MB            | Fast       | Fast        | Medium    | Custom | ✅          | Geo-focused |

**Parquet wins on**:

- **Compression**: 3× smaller than CSV (Snappy/ZSTD)
- **Speed**: Columnar layout → skip irrelevant columns
- **Schema**: Embedded (Thrift), self-describing
- **Ecosystem**: Supported by pandas, DuckDB, Spark, Arrow, GDAL 3.5+

### Parquet Schema Example

```python
import pyarrow as pa
import pyarrow.parquet as pq
from shapely.geometry import Point
import geopandas as gpd

# Define schema (ISO 28258 + Bulgarian extensions)
schema = pa.schema([
    # Identifiers
    pa.field('survey_id', pa.string()),
    pa.field('organization_id', pa.string()),
    pa.field('field_id', pa.string(), nullable=True),

    # Spatial
    pa.field('geometry', pa.binary()),  # WKB format
    pa.field('crs', pa.string()),       # 'EPSG:4326'
    pa.field('municipality', pa.string()),
    pa.field('district', pa.string()),

    # Temporal
    pa.field('sample_date', pa.date32()),
    pa.field('sample_time', pa.time64('us'), nullable=True),

    # Soil Properties (ISO 28258)
    pa.field('ph', pa.float32(), nullable=True),
    pa.field('organic_matter_pct', pa.float32(), nullable=True),
    pa.field('nitrogen_mg_kg', pa.float32(), nullable=True),
    pa.field('phosphorus_mg_kg', pa.float32(), nullable=True),
    pa.field('potassium_mg_kg', pa.float32(), nullable=True),
    pa.field('clay_pct', pa.float32(), nullable=True),
    pa.field('sand_pct', pa.float32(), nullable=True),
    pa.field('silt_pct', pa.float32(), nullable=True),

    # Methodology
    pa.field('lab_method', pa.string()),  # 'ISO 10390' for pH, etc.
    pa.field('sample_depth_cm', pa.int16()),

    # Metadata
    pa.field('created_at', pa.timestamp('us')),
    pa.field('data_quality', pa.string()),  # 'GOOD', 'SUSPECT', 'REJECTED'
])

# Example data
data = {
    'survey_id': ['survey-001'],
    'organization_id': ['org-uuid'],
    'field_id': ['field-uuid'],
    'geometry': [Point(25.4858, 42.7339).wkb],  # WKB binary
    'crs': ['EPSG:4326'],
    'municipality': ['Parvomay'],
    'district': ['Plovdiv'],
    'sample_date': [datetime.date(2024, 4, 15)],
    'ph': [6.8],
    'organic_matter_pct': [3.2],
    'nitrogen_mg_kg': [120.5],
    # ... other fields
}

# Write Parquet file
table = pa.Table.from_pydict(data, schema=schema)
pq.write_table(table, 'surveys.parquet', compression='snappy')
```

### Why Parquet Over Alternatives?

#### vs. CSV

**CSV Pros**: Human-readable, universal support
**CSV Cons**:

- ❌ No schema (ambiguous types: is "42" an integer or string?)
- ❌ No compression (50 MB vs. 15 MB Parquet)
- ❌ No geometry support (need separate WKT column)
- ❌ Slow analytics (must read entire file for one column)

#### vs. GeoPackage

**GeoPackage Pros**: OGC standard, QGIS-friendly
**GeoPackage Cons**:

- ❌ SQLite writes are **slow** (single-threaded)
- ❌ Larger file size (35 MB vs. 15 MB)
- ❌ No columnar layout (slower for analytics)
- ❌ Not cloud-native (requires local file)

**Decision**: Use Parquet for **archival/exchange**, export to GeoPackage for **GIS
users**.

#### vs. Shapefile

**Shapefile**: Legacy format, should be avoided for new projects.

**Limitations**:

- ❌ 2 GB file size limit
- ❌ 10-character field names
- ❌ No date/time types (stored as strings)
- ❌ DBF encoding issues (Bulgarian Cyrillic)

### Cloud-Native Benefits

**Parquet + S3**:

- **Partial Reads**: Read only needed row groups (S3 range requests)
- **Predicate Pushdown**: Filter at storage layer (DuckDB, Athena)
- **Partitioning**: Organize by `sample_date` or `municipality`

**Example**: Query only pH measurements from Parvomay in 2024

```sql
-- DuckDB query on S3 Parquet (no download needed!)
SELECT survey_id, ph, sample_date
FROM 's3://soilviews-data/surveys/*.parquet'
WHERE municipality = 'Parvomay'
  AND YEAR(sample_date) = 2024
  AND ph IS NOT NULL;
```

**Performance**: Scans only relevant row groups (10× faster than CSV).

## Implementation

### Ground-Truth CLI (Python)

```python
# packages/ground-truth-cli/commands/upload.py
import click
import pandas as pd
import pyarrow.parquet as pq
from shapely.geometry import Point
import requests

@click.command()
@click.argument('input_file', type=click.Path(exists=True))
@click.option('--format', type=click.Choice(['csv', 'excel', 'shapefile']), default='csv')
def upload_survey(input_file, format):
    """Upload ground-truth survey data to SoilViews."""

    # Read input file
    if format == 'csv':
        df = pd.read_csv(input_file)
    elif format == 'excel':
        df = pd.read_excel(input_file)
    elif format == 'shapefile':
        df = gpd.read_file(input_file)

    # Validate schema
    validate_iso28258_schema(df)

    # Convert to Parquet
    parquet_file = '/tmp/survey.parquet'
    df.to_parquet(parquet_file, engine='pyarrow', compression='snappy')

    # Upload to API
    with open(parquet_file, 'rb') as f:
        response = requests.post(
            f'{API_BASE_URL}/api/surveys/upload',
            files={'file': f},
            headers={'Authorization': f'Bearer {API_KEY}'}
        )

    if response.status_code == 201:
        click.echo(f"✅ Uploaded {len(df)} surveys successfully")
    else:
        click.echo(f"❌ Upload failed: {response.text}", err=True)

def validate_iso28258_schema(df):
    """Validate DataFrame against ISO 28258 schema."""
    required_fields = ['sample_date', 'latitude', 'longitude']
    for field in required_fields:
        if field not in df.columns:
            raise ValueError(f"Missing required field: {field}")

    # Type checks
    if not pd.api.types.is_numeric_dtype(df['ph']):
        raise ValueError("Field 'ph' must be numeric")

    # Range checks
    if (df['ph'] < 0).any() or (df['ph'] > 14).any():
        raise ValueError("Field 'ph' out of range (0-14)")
```

### API Endpoint (NestJS)

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadSurveys(@UploadedFile() file: Express.Multer.File) {
  // Parse Parquet file
  const parquetBuffer = file.buffer;
  const surveys = await this.parseParquet(parquetBuffer);

  // Validate
  surveys.forEach((survey) => this.validateSurvey(survey));

  // Insert into PostgreSQL
  await this.surveyRepository.save(surveys);

  // Trigger ML retraining queue
  await this.mlQueue.add('retrain', { surveyCount: surveys.length });

  return { message: `Uploaded ${surveys.length} surveys` };
}

private async parseParquet(buffer: Buffer): Promise<Survey[]> {
  // Use @dsnp/parquetjs or call Python microservice
  const table = await parquet.ParquetReader.openBuffer(buffer);
  const cursor = table.getCursor();
  const records = [];

  let record = null;
  while ((record = await cursor.next())) {
    records.push({
      surveyId: record.survey_id,
      organizationId: record.organization_id,
      location: wkb.parse(record.geometry), // Parse WKB to GeoJSON
      sampleDate: record.sample_date,
      ph: record.ph,
      organicMatter: record.organic_matter_pct,
      // ... map other fields
    });
  }

  return records;
}
```

### Export to GeoPackage (for QGIS users)

```python
# Export Parquet to GeoPackage
import geopandas as gpd
import pyarrow.parquet as pq

# Read Parquet
table = pq.read_table('surveys.parquet')
df = table.to_pandas()

# Convert WKB to geometry
df['geometry'] = df['geometry'].apply(wkb.loads)
gdf = gpd.GeoDataFrame(df, geometry='geometry', crs='EPSG:4326')

# Write to GeoPackage
gdf.to_file('surveys.gpkg', driver='GPKG', layer='soil_surveys')
```

## Consequences

### Positive

- ✅ **70% Smaller**: 15 MB vs. 50 MB (CSV)
- ✅ **10× Faster Analytics**: Columnar reads (DuckDB, Pandas)
- ✅ **Self-Describing**: Embedded schema (no separate .json)
- ✅ **Cloud-Native**: S3 range requests, Athena queries
- ✅ **Future-Proof**: Arrow ecosystem (Polars, DataFusion)
- ✅ **ISO Compliance**: Maps to ISO 28258 schema

### Negative

- ❌ **Not Human-Readable**: Requires tools (parquet-tools, DuckDB)
- ❌ **Limited GIS Support**: QGIS needs GDAL 3.5+ (2022)
- ❌ **Binary Format**: Harder to debug (use `parquet-tools schema`)

### Mitigation

- **Export Options**: Provide CSV/GeoPackage export for GIS users
- **Documentation**: Include schema.json with field descriptions
- **Tools**: Bundle `parquet-tools` in CLI (`soilviews inspect surveys.parquet`)

## Alternatives Considered

### FlatGeobuf

**Pros**: Streaming geospatial format, fast
**Cons**: Newer (less tooling), not optimized for analytics

### GeoParquet (OGC Standard)

**GeoParquet** is an extension of Parquet for geospatial data (adds geometry metadata).

**Status**: We will adopt GeoParquet once finalized (currently v1.0 beta, 2024).

## References

- [Apache Parquet Documentation](https://parquet.apache.org/docs/)
- [ISO 28258:2013 Soil Quality - Digital Exchange](https://www.iso.org/standard/44595.html)
- [GeoParquet Specification](https://github.com/opengeospatial/geoparquet)
- [DuckDB Parquet Guide](https://duckdb.org/docs/data/parquet)
- [PyArrow Parquet](https://arrow.apache.org/docs/python/parquet.html)

## Revision History

- 2025-01-16: Initial draft (Accepted)
