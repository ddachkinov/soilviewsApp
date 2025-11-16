# ADR-005: PostgreSQL Partitioning by Crop-Year with PostGIS

## Status

Accepted

## Context

SoilViews stores time-series geospatial data (fields, surveys, maps, prescriptions) that
accumulates over multiple growing seasons. We need a database strategy that:

1. **Scales efficiently** (millions of fields × years)
2. **Supports geospatial queries** (within polygon, distance, area calculations)
3. **Enables time-based queries** (e.g., "all maps for 2024 crop year")
4. **Maintains query performance** as data grows
5. **Supports multi-tenancy** (row-level security per organization)

### Requirements

- **Data Volume**: 100,000 fields × 10 years × 8 soil layers = 8M map records
- **Query Patterns**: 80% queries filter by `organizationId` + `cropYear`
- **Geospatial Ops**: ST_Contains, ST_Intersects, ST_Area, ST_Distance
- **Retention**: Keep data indefinitely (regulatory + research)
- **Backup/Restore**: Fast point-in-time recovery

## Decision

We will use:

- **Database**: **PostgreSQL 16** (latest stable)
- **Spatial Extension**: **PostGIS 3.4**
- **Partitioning Strategy**: **Declarative partitioning by `crop_year`** (RANGE)
- **Indexing**: **GiST** for geometry, **B-tree** for FKs and `organizationId`
- **Catalog**: **pgSTAC** for raster asset management (STAC API compliance)

## Rationale

### Why PostgreSQL?

| Database       | Geospatial | Partitioning | JSON  | Ecosystem | Choice      |
| -------------- | ---------- | ------------ | ----- | --------- | ----------- |
| **PostgreSQL** | ✅ PostGIS | ✅ Native    | ✅ JSONB | ✅ Huge  | **Selected**|
| MySQL          | ⚠️ Limited | ⚠️ Manual    | ✅ JSON  | ✅ Large  | No          |
| MongoDB        | ✅ GeoJSON | N/A          | ✅ BSON  | ✅ Medium | No (no joins)|
| MS SQL Server  | ✅ Spatial | ✅ Native    | ✅ JSON  | ✅ Large  | Too expensive|

**PostgreSQL** is the de facto standard for geospatial applications due to PostGIS maturity.

### Why Partitioning by Crop-Year?

**Problem**: Without partitioning, queries on large tables scan millions of rows.

**Solution**: Partition by `crop_year` (RANGE partitioning) to **eliminate partition
scans**.

**Example Schema**:

```sql
CREATE TABLE maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    field_id UUID NOT NULL REFERENCES fields(id),
    crop_year INT NOT NULL,  -- Partition key
    property_type VARCHAR(20) NOT NULL,  -- 'pH', 'OM', 'N', etc.
    cog_url TEXT NOT NULL,
    geometry GEOMETRY(POLYGON, 4326),
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (crop_year);

-- Create partitions (one per year)
CREATE TABLE maps_2023 PARTITION OF maps FOR VALUES FROM (2023) TO (2024);
CREATE TABLE maps_2024 PARTITION OF maps FOR VALUES FROM (2024) TO (2025);
CREATE TABLE maps_2025 PARTITION OF maps FOR VALUES FROM (2025) TO (2026);

-- Indexes on each partition
CREATE INDEX ON maps_2024 (organization_id);
CREATE INDEX ON maps_2024 USING GIST (geometry);
```

**Query Performance**:

```sql
-- Without partitioning: Scans entire maps table (8M rows)
EXPLAIN SELECT * FROM maps WHERE crop_year = 2024;
-- Seq Scan on maps (cost=0.00..150000.00 rows=8000000)

-- With partitioning: Scans only maps_2024 partition (800K rows)
EXPLAIN SELECT * FROM maps WHERE crop_year = 2024;
-- Seq Scan on maps_2024 (cost=0.00..15000.00 rows=800000)
-- 10x faster!
```

### Why PostGIS?

**PostGIS** adds geospatial capabilities to PostgreSQL:

- **Geometry Types**: POINT, LINESTRING, POLYGON, MULTIPOLYGON
- **Spatial Indexes**: GiST (Generalized Search Tree) for fast spatial queries
- **Operators**: ST_Contains, ST_Intersects, ST_Distance, ST_Area, ST_Union
- **Raster Support**: Store/query rasters directly (not used in SoilViews; we use COGs)
- **Coordinate Systems**: Full EPSG support (WGS84, UTM, Bulgarian CS)

**Example Queries**:

```sql
-- Find all fields within 5 km of a point
SELECT id, name, ST_Distance(geometry, ST_SetSRID(ST_MakePoint(25.4858, 42.7339), 4326)) AS distance
FROM fields
WHERE organization_id = 'org-uuid'
  AND ST_DWithin(geometry, ST_SetSRID(ST_MakePoint(25.4858, 42.7339), 4326), 5000);

-- Calculate total area of fields in organization
SELECT organization_id, SUM(ST_Area(geometry::geography)) / 10000 AS total_hectares
FROM fields
GROUP BY organization_id;

-- Find surveys intersecting a field
SELECT s.id, s.ph, s.organic_matter
FROM surveys s
JOIN fields f ON ST_Intersects(s.location, f.geometry)
WHERE f.id = 'field-uuid';
```

### Why pgSTAC?

**pgSTAC** provides a PostgreSQL schema for **STAC (SpatioTemporal Asset Catalog)**, a
standard for geospatial asset metadata.

**Benefits**:

- Standard API for searching raster assets (COGs)
- Efficient indexing for spatial + temporal queries
- STAC API compliance (external tools can query our catalog)

**Schema**:

```sql
-- pgSTAC stores STAC Items (each map is an Item)
INSERT INTO pgstac.items (id, collection, geometry, datetime, properties, assets)
VALUES (
    'soil-ph-field-123-2024',
    'soil-property-maps',
    ST_GeomFromGeoJSON('{"type":"Polygon",...}'),
    '2024-04-15T00:00:00Z',
    '{"crop_year": 2024, "property_type": "pH", "organization_id": "org-uuid"}'::jsonb,
    '{
        "cog": {
            "href": "s3://soilviews-cogs/soil-ph-field-123-2024.tif",
            "type": "image/tiff; application=geotiff; profile=cloud-optimized"
        }
    }'::jsonb
);
```

## Implementation

### Database Schema (Key Tables)

```sql
-- Organizations (multi-tenancy)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    country_code CHAR(2) DEFAULT 'BG',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fields (farmer parcels)
CREATE TABLE fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    area_hectares DECIMAL(10, 2) GENERATED ALWAYS AS (ST_Area(geometry::geography) / 10000) STORED,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ON fields (organization_id);
CREATE INDEX ON fields USING GIST (geometry);

-- Surveys (ground-truth soil samples)
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    field_id UUID REFERENCES fields(id),
    location GEOMETRY(POINT, 4326) NOT NULL,
    sample_date DATE NOT NULL,
    ph DECIMAL(3, 1),
    organic_matter DECIMAL(4, 2),
    nitrogen DECIMAL(6, 2),
    phosphorus DECIMAL(6, 2),
    potassium DECIMAL(6, 2),
    clay_percent DECIMAL(4, 1),
    sand_percent DECIMAL(4, 1),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ON surveys (organization_id, sample_date);
CREATE INDEX ON surveys USING GIST (location);

-- Maps (soil property predictions) - PARTITIONED
CREATE TABLE maps (
    id UUID DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    field_id UUID NOT NULL REFERENCES fields(id),
    crop_year INT NOT NULL,
    property_type VARCHAR(20) NOT NULL,
    cog_url TEXT NOT NULL,
    geometry GEOMETRY(POLYGON, 4326),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, crop_year)
) PARTITION BY RANGE (crop_year);

-- Automatically create partitions for 2020-2030
DO $$
BEGIN
    FOR year IN 2020..2030 LOOP
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS maps_%s PARTITION OF maps
            FOR VALUES FROM (%s) TO (%s)
        ', year, year, year + 1);
        EXECUTE format('CREATE INDEX IF NOT EXISTS maps_%s_org_id_idx ON maps_%s (organization_id)', year, year);
        EXECUTE format('CREATE INDEX IF NOT EXISTS maps_%s_geom_idx ON maps_%s USING GIST (geometry)', year, year);
    END LOOP;
END $$;
```

### Row-Level Security (Multi-Tenancy)

```sql
-- Enable RLS on fields table
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see fields from their organization
CREATE POLICY fields_org_isolation ON fields
    USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Application sets organization ID at connection time
SET app.current_organization_id = 'user-org-uuid';
```

### TypeORM Entities (NestJS)

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { Geometry } from 'geojson';

@Entity('maps_2024') // Partition table
export class SoilMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  organizationId: string;

  @Column('uuid')
  fieldId: string;

  @Column('int')
  cropYear: number;

  @Column('varchar', { length: 20 })
  propertyType: 'pH' | 'OM' | 'N' | 'P' | 'K' | 'Clay' | 'Sand' | 'Depth';

  @Column('text')
  cogUrl: string;

  @Column('geometry', { spatialFeatureType: 'Polygon', srid: 4326 })
  @Index({ spatial: true })
  geometry: Geometry;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

## Consequences

### Positive

- ✅ **10x Query Speedup**: Partition pruning eliminates 90% of rows
- ✅ **Efficient Backups**: Backup individual partitions (e.g., only 2024 data)
- ✅ **Data Archival**: Move old partitions to cheaper storage (tablespaces)
- ✅ **Parallel Queries**: PostgreSQL can scan partitions in parallel
- ✅ **Simplified Deletion**: `DROP TABLE maps_2020` (instant vs. `DELETE` which requires VACUUM)

### Negative

- ❌ **Schema Complexity**: Need to create new partition each year
- ❌ **Cross-Partition Queries**: Slightly slower if querying multiple years
- ❌ **TypeORM Limitation**: Need to specify partition table name manually

### Mitigation

- **Automated Partition Creation**: Cron job to create next year's partition in December
- **Abstract Partitioning**: Use PostgreSQL views to hide partition details from application
- **Monitor Query Plans**: Use `EXPLAIN ANALYZE` to verify partition pruning

## Alternatives Considered

### Time-Series Databases (TimescaleDB)

**Pros**: Automatic partitioning, time-series optimizations
**Cons**: Overkill for SoilViews (not high-frequency data), less mature than PostgreSQL

### Sharding (Citus)

**Pros**: Horizontal scaling across machines
**Cons**: Complex setup, not needed until > 10TB data

## References

- [PostgreSQL Partitioning Documentation](https://www.postgresql.org/docs/16/ddl-partitioning.html)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [pgSTAC GitHub](https://github.com/stac-utils/pgstac)
- [STAC Specification](https://stacspec.org/)

## Revision History

- 2025-01-16: Initial draft (Accepted)
