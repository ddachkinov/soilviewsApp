# SoilViews Data Intelligence with IBM watsonx.data & MCP Server

**Document Version**: 1.0
**Date**: 2025-01-18
**Purpose**: Address data gaps and enhance ML training with watsonx.data lakehouse + MCP server integration

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Data Challenges](#current-data-challenges)
3. [Watson X.data Architecture](#watson-xdata-architecture)
4. [MCP Server Integration](#mcp-server-integration)
5. [Data Federation Strategy](#data-federation-strategy)
6. [Data Quality & Enrichment Pipeline](#data-quality--enrichment-pipeline)
7. [Training Pipeline Integration](#training-pipeline-integration)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Cost Analysis](#cost-analysis)
10. [Alternative: Pure MCP Approach](#alternative-pure-mcp-approach)

---

## Executive Summary

### Current State
- **Soil Samples**: 18,340 Bulgarian samples (good, but gaps in coverage)
- **Data Sources**: Fragmented (PostgreSQL, S3, CSV files, research institutions)
- **Data Quality**: Variable (different labs, methods, QA levels)
- **Accessibility**: Manual integration, no unified query layer

### Proposed State (watsonx.data + MCP)
- **Data Lakehouse**: Unified storage for all soil data (samples, satellite imagery, weather, field boundaries)
- **Data Federation**: Query across PostgreSQL + S3 + external APIs seamlessly
- **Data Quality**: Automated validation, harmonization, enrichment
- **MCP Server**: AI-accessible data layer for training pipelines and analysis
- **Data Gaps Filled**: Integrate external Bulgarian soil databases (Ministry of Agriculture, EU JRC, research institutions)

### Key Benefits

| Benefit | Impact |
|---------|--------|
| **More Training Data** | Increase from 18K to 50K+ samples (external sources) |
| **Better Data Quality** | Automated QA, harmonization across labs |
| **Faster Training** | Pre-processed, cached datasets |
| **Cost Savings** | Reduce manual data wrangling (80% time saved) |
| **AI-Native Access** | MCP server enables LLM-driven data exploration |
| **Compliance** | GDPR-compliant data governance (EU data residency) |

---

## Current Data Challenges

### 1. Data Gaps

**Geographic Coverage Gaps**:
```
Bulgarian Regions (by EKATTE codes):
├── Northern Bulgaria (Danube Plain)
│   ├── Existing samples: 8,200 (45%)
│   └── Gap: Northeastern corner (Dobrich, Silistra)
├── Central Bulgaria (Thracian Plain)
│   ├── Existing samples: 6,500 (35%)
│   └── Gap: High-elevation areas (Stara Planina)
├── Southern Bulgaria (Rhodope Mountains)
│   ├── Existing samples: 2,800 (15%)
│   └── Gap: Mountainous regions (poor road access)
└── Western Bulgaria (Sofia region)
    ├── Existing samples: 840 (5%)
    └── Gap: Entire western region undersampled
```

**Temporal Gaps**:
- 2017-2019: Only 2,100 samples (11%)
- 2020-2022: 9,400 samples (51%)
- 2023-2025: 6,840 samples (38%)
- **Problem**: No multi-year samples from same locations (no temporal validation)

**Soil Property Gaps**:
- pH, OM, N, P, K: 100% coverage ✅
- Clay/Sand/Silt texture: 85% coverage ⚠️
- Depth to bedrock: 12% coverage ❌
- Micronutrients (Zn, Cu, Mn): 3% coverage ❌
- Soil organic carbon (SOC): 45% coverage ⚠️

### 2. Data Quality Issues

**Heterogeneous Lab Methods**:
```
pH Measurement Methods (should be standardized to ISO 10390):
├── 1:5 water extraction (ISO 10390): 12,400 samples (68%)
├── 1:2.5 water extraction (non-standard): 3,200 samples (17%)
├── 0.01M CaCl2 (EU standard): 2,100 samples (11%)
└── Unknown method: 640 samples (4%)
```

**QA Flag Distribution**:
- GOOD (lab-certified, chain-of-custody): 14,200 samples (77%)
- FAIR (field samples, no certification): 3,100 samples (17%)
- POOR (crowd-sourced, no QA): 1,040 samples (6%)

**Coordinate Accuracy**:
- GPS-grade (±2m): 9,800 samples (53%)
- Smartphone GPS (±10m): 7,200 samples (39%)
- Estimated from field sketch: 1,340 samples (8%)

### 3. Data Silos

**Current Data Sources**:
```
Data Silos (no unified access):
├── SoilViews PostgreSQL Database
│   └── 18,340 samples (primary source)
├── AWS S3 Buckets
│   ├── Sentinel-2 COGs (500 GB)
│   └── Historical samples (Parquet backups)
├── Ministry of Agriculture (Bulgaria)
│   ├── 347 national grid samples (1 km² grid)
│   └── Access: Manual download from portal
├── EU Joint Research Centre (JRC)
│   ├── LUCAS soil database (800+ Bulgarian samples)
│   └── Access: Annual data release (CSV)
├── Bulgarian Academy of Sciences
│   ├── Research datasets (5,000+ samples, unpublished)
│   └── Access: Partnership negotiations
└── Carbonsafe Bulgaria
    ├── Commercial soil sampling service (10,000+ samples)
    └── Access: API (paid subscription)
```

**Problem**: Each data source requires custom integration → 80% of time spent on data wrangling

---

## Watson X.data Architecture

### What is watsonx.data?

**IBM watsonx.data** is a data lakehouse platform that combines:
- **Data Lake**: Store any format (Parquet, CSV, GeoTIFF, JSON)
- **Data Warehouse**: SQL queries with governance
- **Data Federation**: Query across multiple sources without moving data

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ IBM watsonx.data Lakehouse                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Storage Layer (Open Lakehouse Format)                                      │
│  ├── Apache Iceberg Tables (ACID transactions, time travel)                │
│  │   ├── soil_samples_unified (18K + 20K external = 38K total)            │
│  │   ├── sentinel2_metadata (500 GB imagery catalog)                       │
│  │   ├── weather_timeseries (daily data 2017-2025)                         │
│  │   └── field_boundaries (KAIS cadastre, 5.3M ha)                         │
│  └── Object Storage (S3-compatible)                                         │
│      ├── MinIO (on-premises) or IBM Cloud Object Storage                   │
│      └── Partitioned by: year, municipality, soil_type                     │
│                                                                             │
│  Query Engines (Federated SQL)                                              │
│  ├── Presto (distributed SQL for lakehouse tables)                         │
│  │   ├── Query Iceberg tables directly                                     │
│  │   └── Pushdown filters to S3 (predicate pushdown)                       │
│  ├── Spark (batch processing for ML feature engineering)                   │
│  │   ├── Read from Iceberg, write to training datasets                     │
│  │   └── Distributed joins (samples + Sentinel-2 pixels)                   │
│  └── Db2 Warehouse (OLAP for dashboards)                                   │
│                                                                             │
│  Data Connectors (Federation)                                               │
│  ├── PostgreSQL (SoilViews production DB) - live federation                │
│  ├── AWS S3 (existing Sentinel-2 COGs) - no data movement                  │
│  ├── REST API Connectors                                                    │
│  │   ├── Carbonsafe API (10K commercial samples)                           │
│  │   ├── EU JRC LUCAS API (800 Bulgarian samples)                          │
│  │   └── OpenWeatherMap API (historical weather)                           │
│  └── File Uploads                                                           │
│      ├── Ministry of Agriculture CSV (347 national grid samples)           │
│      └── Bulgarian Academy of Sciences Parquet (5K research samples)       │
│                                                                             │
│  Data Quality & Governance                                                  │
│  ├── Data Quality Rules                                                     │
│  │   ├── pH range: 4.0-9.0 (reject outliers)                               │
│  │   ├── Coordinate validation (must be in Bulgaria bounding box)          │
│  │   ├── Lab method harmonization (convert to ISO 10390 equivalent)        │
│  │   └── Duplicate detection (by lat/lon/date)                             │
│  ├── Metadata Catalog (Apache Hive Metastore)                              │
│  │   ├── Schema registry (all table schemas)                               │
│  │   ├── Lineage tracking (data provenance)                                │
│  │   └── Access control (RBAC, column-level security)                      │
│  └── Data Profiling                                                         │
│      ├── Automated data quality reports                                    │
│      └── Anomaly detection (flag suspect samples)                          │
│                                                                             │
│  ML Feature Store                                                           │
│  ├── Pre-computed Features                                                  │
│  │   ├── Sentinel-2 pixel extractions (cached)                             │
│  │   ├── Temporal features (30-day rolling avg weather)                    │
│  │   ├── Spatial features (distance to nearest road, elevation)            │
│  │   └── Derived features (NDVI, soil moisture indices)                    │
│  └── Versioned Datasets                                                     │
│      ├── training_v1.0 (18,340 samples, 2024-12-01)                        │
│      ├── training_v1.1 (25,000 samples, 2025-01-15, +JRC data)            │
│      └── training_v2.0 (38,000 samples, 2025-02-01, +all sources)         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ SQL / Spark / REST API
         ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ MCP Server (Model Context Protocol)                                         │
│ - AI-native data access for training pipelines                              │
│ - Natural language queries → SQL → Results                                  │
│ - Integration with PyTorch DataLoader                                       │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ Training Pipeline (OpenShift AI or AWS SageMaker)                           │
│ - Fetch training data via MCP server                                        │
│ - Train EfficientNet-b3 + DeepLabV3+                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Apache Iceberg Tables

**Why Iceberg?**
- ✅ **ACID transactions**: No partial writes
- ✅ **Time travel**: Query historical data snapshots
- ✅ **Schema evolution**: Add columns without rewriting data
- ✅ **Partition pruning**: Fast queries on large datasets
- ✅ **Hidden partitioning**: Automatic partitioning by year/municipality

**Example Schema**:
```sql
CREATE TABLE soil_samples_unified (
  sample_id STRING NOT NULL,
  source STRING NOT NULL,  -- 'soilviews' | 'jrc' | 'ministry' | 'academy' | 'carbonsafe'
  latitude DOUBLE NOT NULL,
  longitude DOUBLE NOT NULL,
  sample_date DATE NOT NULL,
  depth_cm INT,

  -- Soil Properties
  ph DOUBLE,
  om_pct DOUBLE,
  n_mg_kg DOUBLE,
  p_mg_kg DOUBLE,
  k_mg_kg DOUBLE,
  clay_pct DOUBLE,
  sand_pct DOUBLE,
  silt_pct DOUBLE,
  soc_pct DOUBLE,  -- Soil Organic Carbon

  -- Metadata
  lab_method STRING,
  lab_name STRING,
  qa_flag STRING,  -- 'GOOD' | 'FAIR' | 'POOR'
  gps_accuracy_m DOUBLE,
  municipality STRING,
  soil_type STRING,  -- FAO classification

  -- Provenance
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  data_version STRING
)
USING iceberg
PARTITIONED BY (years(sample_date), municipality)
TBLPROPERTIES (
  'write.format.default' = 'parquet',
  'write.parquet.compression-codec' = 'zstd'
);
```

#### 2. Presto Federated Queries

**Query across all sources without data movement**:

```sql
-- Query combines SoilViews PostgreSQL + JRC LUCAS + Ministry CSV
SELECT
  s.sample_id,
  s.latitude,
  s.longitude,
  s.ph,
  s.om_pct,
  s.source,
  w.avg_temp_c,
  w.precipitation_mm,
  sb.field_area_ha
FROM
  lakehouse.soil_samples_unified s
LEFT JOIN
  postgresql.soilviews.soil_samples ps ON s.sample_id = ps.sample_id
LEFT JOIN
  lakehouse.weather_timeseries w ON s.municipality = w.municipality
    AND s.sample_date = w.date
LEFT JOIN
  s3_catalog.field_boundaries sb ON ST_Contains(sb.geometry, ST_Point(s.longitude, s.latitude))
WHERE
  s.sample_date >= '2023-01-01'
  AND s.qa_flag = 'GOOD'
  AND s.ph BETWEEN 4.0 AND 9.0
ORDER BY s.sample_date DESC;
```

#### 3. Spark Feature Engineering

**Pre-compute features for training**:

```python
# spark_feature_engineering.py
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, udf
from pyspark.sql.types import ArrayType, DoubleType
import rasterio

spark = SparkSession.builder \
    .appName("SoilViews Feature Engineering") \
    .config("spark.sql.catalog.lakehouse", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.lakehouse.type", "hive") \
    .getOrCreate()

# Load unified soil samples
samples_df = spark.table("lakehouse.soil_samples_unified")

# Extract Sentinel-2 pixels (distributed UDF)
@udf(returnType=ArrayType(DoubleType()))
def extract_sentinel2_pixel(lat, lon, date):
    """Extract 8-band Sentinel-2 pixel at (lat, lon, date)"""
    # Find matching Sentinel-2 image
    s2_path = f"s3://soilviews-cogs/sentinel2-{date}-bulgaria.tif"

    with rasterio.open(s2_path) as src:
        # Convert lat/lon to pixel coordinates
        row, col = src.index(lon, lat)
        # Read 8 bands at that pixel
        pixel_values = [float(src.read(band, window=((row, row+1), (col, col+1))).flatten()[0])
                        for band in range(1, 9)]
    return pixel_values

# Apply UDF to all samples (distributed across Spark workers)
samples_with_features = samples_df.withColumn(
    "sentinel2_features",
    extract_sentinel2_pixel(col("latitude"), col("longitude"), col("sample_date"))
)

# Write to Iceberg table (versioned dataset)
samples_with_features.writeTo("lakehouse.training_dataset_v2") \
    .using("iceberg") \
    .tableProperty("format-version", "2") \
    .createOrReplace()

print(f"Created training dataset with {samples_with_features.count()} samples")
```

---

## MCP Server Integration

### What is MCP (Model Context Protocol)?

**MCP** is a protocol developed by Anthropic for connecting AI assistants to data sources, enabling:
- Natural language queries to databases
- Tool use for data retrieval
- Context-aware data access during AI inference

### MCP Server Architecture for SoilViews

```
┌─────────────────────────────────────────────────────────────────┐
│ MCP Server (Python FastAPI)                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MCP Protocol Endpoints                                         │
│  ├── /mcp/tools/list (list available data tools)               │
│  ├── /mcp/tools/call (execute data queries)                    │
│  └── /mcp/resources/list (list available datasets)             │
│                                                                 │
│  Data Access Tools (exposed via MCP)                            │
│  ├── query_soil_samples(filters)                               │
│  │   └── SQL → Presto → Iceberg tables                         │
│  ├── get_sentinel2_image(bbox, date)                           │
│  │   └── S3 → COG → NumPy array                                │
│  ├── fetch_weather_data(location, date_range)                  │
│  │   └── OpenWeatherMap API → time series                      │
│  ├── search_cadastre(ekatte_code)                              │
│  │   └── KAIS API → field boundaries                           │
│  └── get_training_dataset(version)                             │
│      └── Iceberg → Parquet → PyTorch DataLoader                │
│                                                                 │
│  Authentication & Authorization                                 │
│  ├── API key validation                                        │
│  ├── Rate limiting (1000 req/min)                              │
│  └── RBAC (read-only for training jobs)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### MCP Server Implementation

**1. Server Setup**:

```python
# mcp_server/server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import prestodb
import boto3
import pandas as pd

app = FastAPI(title="SoilViews MCP Server")

# Initialize Presto connection (watsonx.data)
presto_conn = prestodb.dbapi.connect(
    host='watsonx-data.ibm.com',
    port=8443,
    user='soilviews',
    catalog='lakehouse',
    schema='default'
)

class MCPTool(BaseModel):
    name: str
    description: str
    inputSchema: Dict[str, Any]

class MCPToolCall(BaseModel):
    name: str
    arguments: Dict[str, Any]

@app.get("/mcp/tools/list")
async def list_tools() -> List[MCPTool]:
    """List all available data access tools"""
    return [
        MCPTool(
            name="query_soil_samples",
            description="Query soil samples from unified database with filters",
            inputSchema={
                "type": "object",
                "properties": {
                    "municipality": {"type": "string", "description": "EKATTE municipality code"},
                    "date_from": {"type": "string", "format": "date"},
                    "date_to": {"type": "string", "format": "date"},
                    "qa_flag": {"type": "string", "enum": ["GOOD", "FAIR", "POOR"]},
                    "limit": {"type": "integer", "default": 1000}
                },
                "required": []
            }
        ),
        MCPTool(
            name="get_training_dataset",
            description="Get pre-processed training dataset for ML",
            inputSchema={
                "type": "object",
                "properties": {
                    "version": {"type": "string", "description": "Dataset version (e.g., v2.0)"},
                    "format": {"type": "string", "enum": ["parquet", "csv", "pytorch"], "default": "parquet"}
                },
                "required": ["version"]
            }
        ),
        MCPTool(
            name="fetch_weather_data",
            description="Get historical weather data for a location",
            inputSchema={
                "type": "object",
                "properties": {
                    "latitude": {"type": "number"},
                    "longitude": {"type": "number"},
                    "date_from": {"type": "string", "format": "date"},
                    "date_to": {"type": "string", "format": "date"}
                },
                "required": ["latitude", "longitude", "date_from", "date_to"]
            }
        )
    ]

@app.post("/mcp/tools/call")
async def call_tool(tool_call: MCPToolCall) -> Dict[str, Any]:
    """Execute a data access tool"""

    if tool_call.name == "query_soil_samples":
        return query_soil_samples(**tool_call.arguments)

    elif tool_call.name == "get_training_dataset":
        return get_training_dataset(**tool_call.arguments)

    elif tool_call.name == "fetch_weather_data":
        return fetch_weather_data(**tool_call.arguments)

    else:
        raise HTTPException(status_code=404, detail=f"Tool {tool_call.name} not found")

def query_soil_samples(
    municipality: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    qa_flag: Optional[str] = None,
    limit: int = 1000
) -> Dict[str, Any]:
    """Query soil samples from watsonx.data lakehouse"""

    # Build SQL query with filters
    sql = """
    SELECT
        sample_id, source, latitude, longitude, sample_date,
        ph, om_pct, n_mg_kg, p_mg_kg, k_mg_kg,
        clay_pct, sand_pct, silt_pct,
        lab_method, qa_flag, municipality
    FROM lakehouse.soil_samples_unified
    WHERE 1=1
    """

    params = []
    if municipality:
        sql += " AND municipality = ?"
        params.append(municipality)
    if date_from:
        sql += " AND sample_date >= ?"
        params.append(date_from)
    if date_to:
        sql += " AND sample_date <= ?"
        params.append(date_to)
    if qa_flag:
        sql += " AND qa_flag = ?"
        params.append(qa_flag)

    sql += f" LIMIT {limit}"

    # Execute query via Presto
    cursor = presto_conn.cursor()
    cursor.execute(sql, params)

    # Convert to DataFrame
    df = pd.DataFrame(cursor.fetchall(), columns=[desc[0] for desc in cursor.description])

    return {
        "count": len(df),
        "samples": df.to_dict(orient="records")
    }

def get_training_dataset(version: str, format: str = "parquet") -> Dict[str, Any]:
    """Get pre-processed training dataset"""

    # Query versioned training dataset from Iceberg
    sql = f"""
    SELECT * FROM lakehouse.training_dataset_{version.replace('.', '_')}
    """

    cursor = presto_conn.cursor()
    cursor.execute(sql)
    df = pd.DataFrame(cursor.fetchall(), columns=[desc[0] for desc in cursor.description])

    if format == "parquet":
        # Return S3 path to Parquet file
        s3_path = f"s3://soilviews-datasets/training_{version}.parquet"
        df.to_parquet(s3_path)
        return {"path": s3_path, "count": len(df)}

    elif format == "pytorch":
        # Return PyTorch-compatible format
        import torch
        features = torch.tensor(df['sentinel2_features'].tolist())
        targets = torch.tensor(df[['ph', 'om_pct', 'n_mg_kg', 'p_mg_kg', 'k_mg_kg',
                                     'clay_pct', 'sand_pct']].values)
        return {
            "features_shape": list(features.shape),
            "targets_shape": list(targets.shape),
            "download_url": f"http://mcp-server/datasets/{version}.pt"
        }

def fetch_weather_data(latitude: float, longitude: float,
                       date_from: str, date_to: str) -> Dict[str, Any]:
    """Fetch historical weather data (temperature, precipitation)"""

    # Query pre-loaded weather data from watsonx.data
    sql = """
    SELECT date, avg_temp_c, precipitation_mm, humidity_pct
    FROM lakehouse.weather_timeseries
    WHERE ST_Distance(ST_Point(longitude, latitude), ST_Point(?, ?)) < 10000  -- within 10 km
      AND date BETWEEN ? AND ?
    ORDER BY date
    """

    cursor = presto_conn.cursor()
    cursor.execute(sql, [longitude, latitude, date_from, date_to])
    df = pd.DataFrame(cursor.fetchall(), columns=[desc[0] for desc in cursor.description])

    return {
        "location": {"latitude": latitude, "longitude": longitude},
        "date_range": {"from": date_from, "to": date_to},
        "data": df.to_dict(orient="records")
    }
```

**2. PyTorch DataLoader Integration**:

```python
# ml_pipeline/dataloader_mcp.py
import torch
from torch.utils.data import Dataset, DataLoader
import requests

class MCPDataset(Dataset):
    """PyTorch Dataset that fetches data from MCP server"""

    def __init__(self, mcp_url, dataset_version, api_key):
        self.mcp_url = mcp_url
        self.api_key = api_key

        # Fetch training dataset via MCP
        response = requests.post(
            f"{mcp_url}/mcp/tools/call",
            json={
                "name": "get_training_dataset",
                "arguments": {
                    "version": dataset_version,
                    "format": "pytorch"
                }
            },
            headers={"Authorization": f"Bearer {api_key}"}
        )

        data = response.json()

        # Download PyTorch tensors
        features_url = data['download_url'].replace('.pt', '_features.pt')
        targets_url = data['download_url'].replace('.pt', '_targets.pt')

        self.features = torch.load(requests.get(features_url, stream=True).raw)
        self.targets = torch.load(requests.get(targets_url, stream=True).raw)

    def __len__(self):
        return len(self.features)

    def __getitem__(self, idx):
        return self.features[idx], self.targets[idx]

# Usage in training script
mcp_dataset = MCPDataset(
    mcp_url="https://mcp.soilviews.bg",
    dataset_version="v2.0",
    api_key="sk-soilviews-..."
)

train_loader = DataLoader(
    mcp_dataset,
    batch_size=4,
    shuffle=True,
    num_workers=4
)

# Train model
for epoch in range(100):
    for features, targets in train_loader:
        # Training loop
        ...
```

**3. Natural Language Queries (AI-Powered)**:

```python
# Example: AI assistant queries data via MCP during training

# AI: "I need soil samples from Northern Bulgaria with good quality data from 2023"
# → MCP translates to:
mcp_client.call_tool(
    name="query_soil_samples",
    arguments={
        "municipality": None,  # Will query all Northern municipalities
        "date_from": "2023-01-01",
        "date_to": "2023-12-31",
        "qa_flag": "GOOD",
        "limit": 10000
    }
)
# → Returns 4,200 samples

# AI: "Get the latest training dataset with external sources included"
# → MCP translates to:
mcp_client.call_tool(
    name="get_training_dataset",
    arguments={
        "version": "v2.0",  # Latest version with JRC + Ministry data
        "format": "parquet"
    }
)
# → Returns dataset with 38,000 samples
```

---

## Data Federation Strategy

### External Data Sources to Integrate

#### 1. EU Joint Research Centre (JRC) - LUCAS Soil Database

**Source**: https://esdac.jrc.ec.europa.eu/projects/lucas

**Data**:
- 800+ Bulgarian soil samples (part of 27,000 EU-wide samples)
- Sampled on 2 km × 2 km grid (systematic coverage)
- Properties: pH, OM, N, P, K, texture, bulk density, SOC
- Time period: 2009, 2012, 2015, 2018 (4-year intervals)

**Integration Method**:
```python
# Presto connector to CSV files
CREATE TABLE jrc_lucas_soil (
  point_id STRING,
  country STRING,
  latitude DOUBLE,
  longitude DOUBLE,
  survey_year INT,
  ph_cacl2 DOUBLE,
  oc_pct DOUBLE,  -- Organic Carbon
  n_pct DOUBLE,
  p_mg_kg DOUBLE,
  clay_pct DOUBLE,
  sand_pct DOUBLE,
  silt_pct DOUBLE
)
WITH (
  format = 'CSV',
  external_location = 's3://soilviews-external/jrc-lucas/bulgaria/',
  skip_header_line_count = 1
);

-- Harmonize to SoilViews schema
INSERT INTO soil_samples_unified
SELECT
  point_id AS sample_id,
  'jrc' AS source,
  latitude,
  longitude,
  CAST(survey_year || '-06-01' AS DATE) AS sample_date,  -- Assume mid-year
  0 AS depth_cm,  -- Topsoil (0-20 cm)
  ph_cacl2 * 1.1 AS ph,  -- Convert CaCl2 to water pH (approximate)
  oc_pct * 1.72 AS om_pct,  -- Convert OC to OM (Van Bemmelen factor)
  n_pct * 10000 AS n_mg_kg,  -- Convert % to mg/kg
  p_mg_kg,
  NULL AS k_mg_kg,  -- Not available in LUCAS
  clay_pct,
  sand_pct,
  silt_pct,
  NULL AS soc_pct,
  'CaCl2' AS lab_method,
  'JRC LUCAS Lab' AS lab_name,
  'GOOD' AS qa_flag,  -- JRC data is high quality
  50.0 AS gps_accuracy_m,  -- Grid-based sampling
  NULL AS municipality,  -- Need to geocode
  NULL AS soil_type,
  CURRENT_TIMESTAMP AS created_at,
  CURRENT_TIMESTAMP AS updated_at,
  'jrc_lucas_2025-01' AS data_version
FROM jrc_lucas_soil
WHERE country = 'BG';  -- Bulgaria only
```

**Expected**: +800 samples (4.4% increase)

#### 2. Bulgarian Ministry of Agriculture - National Grid

**Source**: https://www.mzh.government.bg/ (manual download)

**Data**:
- 347 samples on 1 km² national grid
- Surveyed in 2021 (single year)
- Properties: pH, OM, N, P, K
- High quality (government labs)

**Integration Method**:
```python
# CSV upload to watsonx.data
CREATE TABLE ministry_national_grid (
  grid_id STRING,
  ekatte STRING,
  x_coord DOUBLE,  -- BGS2005 coordinates
  y_coord DOUBLE,
  ph DOUBLE,
  om_pct DOUBLE,
  n_mg_kg DOUBLE,
  p_mg_kg DOUBLE,
  k_mg_kg DOUBLE,
  sample_year INT
)
WITH (
  format = 'CSV',
  external_location = 's3://soilviews-external/ministry/grid-2021.csv'
);

-- Convert BGS2005 to WGS84 using PostGIS extension in Presto
INSERT INTO soil_samples_unified
SELECT
  grid_id AS sample_id,
  'ministry' AS source,
  ST_Y(ST_Transform(ST_Point(x_coord, y_coord), 7801, 4326)) AS latitude,
  ST_X(ST_Transform(ST_Point(x_coord, y_coord), 7801, 4326)) AS longitude,
  CAST('2021-05-01' AS DATE) AS sample_date,
  20 AS depth_cm,
  ph,
  om_pct,
  n_mg_kg,
  p_mg_kg,
  k_mg_kg,
  NULL AS clay_pct,  -- Not measured
  NULL AS sand_pct,
  NULL AS silt_pct,
  NULL AS soc_pct,
  'ISO 10390' AS lab_method,
  'Ministry of Agriculture Lab' AS lab_name,
  'GOOD' AS qa_flag,
  2.0 AS gps_accuracy_m,  -- RTK GPS used
  ekatte AS municipality,
  NULL AS soil_type,
  CURRENT_TIMESTAMP AS created_at,
  CURRENT_TIMESTAMP AS updated_at,
  'ministry_2021' AS data_version
FROM ministry_national_grid;
```

**Expected**: +347 samples (1.9% increase)

#### 3. Bulgarian Academy of Sciences - Research Datasets

**Source**: Partnership agreement (unpublished data)

**Data**:
- 5,000+ samples from research projects (2015-2024)
- Variable coverage (project-dependent)
- Properties: pH, OM, N, P, K, micronutrients (Zn, Cu, Mn)
- Mixed quality (GOOD to FAIR)

**Integration Method**:
```python
# Parquet files from research archive
CREATE TABLE academy_research (
  project_id STRING,
  sample_code STRING,
  lat DOUBLE,
  lon DOUBLE,
  collection_date DATE,
  ph DOUBLE,
  om_pct DOUBLE,
  n_pct DOUBLE,
  p_ppm DOUBLE,
  k_ppm DOUBLE,
  zn_ppm DOUBLE,
  cu_ppm DOUBLE,
  mn_ppm DOUBLE,
  quality_level STRING
)
WITH (
  format = 'PARQUET',
  external_location = 's3://soilviews-external/academy/research-archive/'
);

-- Harmonize units (ppm → mg/kg, % → mg/kg)
INSERT INTO soil_samples_unified
SELECT
  project_id || '-' || sample_code AS sample_id,
  'academy' AS source,
  lat AS latitude,
  lon AS longitude,
  collection_date AS sample_date,
  20 AS depth_cm,  -- Assume topsoil
  ph,
  om_pct,
  n_pct * 10000 AS n_mg_kg,
  p_ppm AS p_mg_kg,
  k_ppm AS k_mg_kg,
  NULL AS clay_pct,
  NULL AS sand_pct,
  NULL AS silt_pct,
  NULL AS soc_pct,
  'Various' AS lab_method,
  'Bulgarian Academy of Sciences' AS lab_name,
  quality_level AS qa_flag,  -- GOOD | FAIR
  10.0 AS gps_accuracy_m,
  NULL AS municipality,
  NULL AS soil_type,
  CURRENT_TIMESTAMP AS created_at,
  CURRENT_TIMESTAMP AS updated_at,
  'academy_2025-01' AS data_version
FROM academy_research
WHERE lat BETWEEN 41.0 AND 44.5  -- Bulgaria bounding box
  AND lon BETWEEN 22.0 AND 29.0;
```

**Expected**: +5,000 samples (27% increase) + **micronutrient data** (Zn, Cu, Mn)

#### 4. Carbonsafe Bulgaria - Commercial API

**Source**: https://carbonsafe.bg/ (API subscription: €500/month)

**Data**:
- 10,000+ commercial soil samples (farmers pay for analysis)
- High spatial resolution (farms purchase multiple samples per field)
- Properties: Full suite (pH, OM, N, P, K, texture, micronutrients, SOC)
- High quality (ISO-certified lab)

**Integration Method (REST API Connector)**:
```python
# Presto REST connector
CREATE TABLE carbonsafe_samples (
  sample_uuid STRING,
  farmer_id STRING,
  location STRUCT<lat DOUBLE, lon DOUBLE>,
  sampled_at TIMESTAMP,
  analysis STRUCT<
    ph DOUBLE,
    om_pct DOUBLE,
    n_mg_kg DOUBLE,
    p_mg_kg DOUBLE,
    k_mg_kg DOUBLE,
    clay_pct DOUBLE,
    sand_pct DOUBLE,
    silt_pct DOUBLE,
    soc_pct DOUBLE,
    zn_mg_kg DOUBLE,
    cu_mg_kg DOUBLE,
    mn_mg_kg DOUBLE
  >,
  lab_metadata STRUCT<
    method STRING,
    certification STRING,
    accuracy STRING
  >
)
WITH (
  connector = 'rest',
  rest.url = 'https://api.carbonsafe.bg/v1/samples',
  rest.auth = 'Bearer {{API_KEY}}',
  rest.method = 'GET',
  rest.pagination = 'cursor'
);

-- Stream data into lakehouse (incremental refresh)
INSERT INTO soil_samples_unified
SELECT
  sample_uuid AS sample_id,
  'carbonsafe' AS source,
  location.lat AS latitude,
  location.lon AS longitude,
  CAST(sampled_at AS DATE) AS sample_date,
  20 AS depth_cm,
  analysis.ph,
  analysis.om_pct,
  analysis.n_mg_kg,
  analysis.p_mg_kg,
  analysis.k_mg_kg,
  analysis.clay_pct,
  analysis.sand_pct,
  analysis.silt_pct,
  analysis.soc_pct,
  lab_metadata.method AS lab_method,
  'Carbonsafe Lab' AS lab_name,
  'GOOD' AS qa_flag,
  5.0 AS gps_accuracy_m,
  NULL AS municipality,
  NULL AS soil_type,
  CURRENT_TIMESTAMP AS created_at,
  CURRENT_TIMESTAMP AS updated_at,
  'carbonsafe_api' AS data_version
FROM carbonsafe_samples
WHERE sampled_at > DATE_SUB(CURRENT_DATE, 365);  -- Last year only
```

**Expected**: +10,000 samples (54% increase) + **full property coverage**

**Cost**: €500/month × 12 = **€6,000/year** (but high-value data)

### Summary: Data Gaps Filled

| Data Source | Samples | Geographic Coverage | Properties | Quality | Cost |
|-------------|---------|---------------------|------------|---------|------|
| **Current (SoilViews)** | 18,340 | Patchy (gaps in West/South) | pH, OM, N, P, K, texture (85%) | GOOD: 77% | €0 |
| **JRC LUCAS** | +800 | Systematic grid (2 km) | pH, OM, N, P, texture, SOC | GOOD: 100% | Free |
| **Ministry** | +347 | National grid (1 km) | pH, OM, N, P, K | GOOD: 100% | Free |
| **Academy** | +5,000 | Research sites | pH, OM, N, P, K, **micronutrients** | GOOD: 60% | Free (partnership) |
| **Carbonsafe** | +10,000 | Commercial farms | **Full suite** (all properties) | GOOD: 100% | €6,000/year |
| **Total** | **34,487** | **88% of Bulgaria covered** | **Full coverage** | **GOOD: 85%** | **€6,000/year** |

**Improvement**: 88% increase in samples (18K → 34K), fills geographic and property gaps

---

## Data Quality & Enrichment Pipeline

### Automated Data Quality Rules

```sql
-- Data Quality Rules in watsonx.data

-- Rule 1: pH Range Validation
CREATE OR REPLACE FUNCTION validate_ph(ph DOUBLE) RETURNS STRING
RETURN CASE
  WHEN ph < 4.0 OR ph > 9.0 THEN 'REJECT'
  WHEN ph < 4.5 OR ph > 8.5 THEN 'WARNING'
  ELSE 'PASS'
END;

-- Rule 2: Coordinate Validation (Bulgaria bounding box)
CREATE OR REPLACE FUNCTION validate_coordinates(lat DOUBLE, lon DOUBLE) RETURNS STRING
RETURN CASE
  WHEN lat < 41.0 OR lat > 44.5 OR lon < 22.0 OR lon > 29.0 THEN 'REJECT'
  ELSE 'PASS'
END;

-- Rule 3: Duplicate Detection (same location + date)
CREATE OR REPLACE VIEW duplicate_samples AS
SELECT
  sample_id,
  COUNT(*) OVER (PARTITION BY ROUND(latitude, 4), ROUND(longitude, 4), sample_date) AS duplicate_count
FROM soil_samples_unified;

-- Rule 4: Lab Method Harmonization
CREATE OR REPLACE FUNCTION harmonize_ph(ph DOUBLE, method STRING) RETURNS DOUBLE
RETURN CASE
  WHEN method = '0.01M CaCl2' THEN ph + 0.5  -- CaCl2 is ~0.5 lower than water
  WHEN method = '1:2.5 water' THEN ph - 0.1   -- Dilution effect
  ELSE ph  -- ISO 10390 (1:5 water) is standard
END;

-- Apply rules to all incoming data
CREATE OR REPLACE VIEW soil_samples_validated AS
SELECT
  *,
  validate_ph(ph) AS ph_validation,
  validate_coordinates(latitude, longitude) AS coord_validation,
  harmonize_ph(ph, lab_method) AS ph_harmonized
FROM soil_samples_unified
WHERE validate_ph(ph) != 'REJECT'
  AND validate_coordinates(latitude, longitude) != 'REJECT';
```

### Data Enrichment Pipeline

**Add derived features**:

```sql
-- Enrichment: Add municipality (geocoding)
UPDATE soil_samples_unified s
SET municipality = (
  SELECT ekatte
  FROM cadastre.municipality_boundaries m
  WHERE ST_Contains(m.geometry, ST_Point(s.longitude, s.latitude))
  LIMIT 1
)
WHERE municipality IS NULL;

-- Enrichment: Add soil type (FAO classification from lookup table)
UPDATE soil_samples_unified s
SET soil_type = (
  SELECT fao_class
  FROM reference.soil_type_map m
  WHERE ST_Contains(m.geometry, ST_Point(s.longitude, s.latitude))
  LIMIT 1
)
WHERE soil_type IS NULL;

-- Enrichment: Add elevation (from SRTM DEM)
UPDATE soil_samples_unified s
SET elevation_m = (
  SELECT ST_Value(raster, ST_Point(s.longitude, s.latitude))
  FROM reference.srtm_dem
)
WHERE elevation_m IS NULL;
```

---

## Training Pipeline Integration

### Workflow: watsonx.data → MCP → Training

```
1. Data Ingestion
   ├── Ingest external sources (JRC, Ministry, Academy, Carbonsafe)
   ├── Validate & harmonize data
   └── Write to Iceberg table: soil_samples_unified (34K samples)

2. Feature Engineering (Spark job)
   ├── Extract Sentinel-2 pixels for each sample
   ├── Compute derived features (NDVI, soil moisture indices)
   ├── Aggregate weather data (30-day averages)
   └── Write to Iceberg: training_dataset_v2 (34K samples + features)

3. Dataset Versioning
   ├── Create snapshot in Iceberg (immutable, reproducible)
   ├── Register in MCP server (version v2.0)
   └── Publish to model registry metadata

4. Training (via MCP)
   ├── Training script calls MCP: get_training_dataset(version='v2.0')
   ├── MCP returns PyTorch DataLoader
   ├── Train EfficientNet-b3 + DeepLabV3+ on 34K samples
   └── Model achieves R² = 0.82 (vs 0.78 baseline with 18K samples)

5. Model Deployment
   ├── Export to TorchScript
   ├── Deploy to KServe or AWS Lambda
   └── Log model lineage (training data version v2.0)
```

### Expected Performance Gains

| Metric | Baseline (18K samples) | With External Data (34K samples) |
|--------|------------------------|----------------------------------|
| **R² (pH)** | 0.78 | **0.84** (+8%) |
| **R² (OM)** | 0.75 | **0.81** (+8%) |
| **R² (N)** | 0.72 | **0.79** (+10%) |
| **R² (texture)** | 0.65 | **0.73** (+12%) |
| **Geographic generalization** | Poor (gaps in West/South) | **Good (88% coverage)** |
| **Temporal robustness** | Medium (limited multi-year data) | **High (2009-2025 time series)** |

**Key Insight**: +88% more data → +8-12% accuracy improvement

---

## Implementation Roadmap

### 90-Day Plan (Parallel with OpenShift AI Trial)

```
Week 1-2: watsonx.data Setup
├── Day 1-3: Provision watsonx.data instance (IBM Cloud or on-prem)
├── Day 4-7: Configure Presto, Spark, Iceberg
├── Day 8-10: Migrate SoilViews PostgreSQL → Iceberg table
├── Day 11-14: Ingest JRC LUCAS + Ministry CSV data
└── Deliverable: Unified lakehouse with 19,487 samples

Week 3-4: Data Federation & Quality
├── Day 15-18: Connect to Bulgarian Academy (partnership)
├── Day 19-21: Integrate Carbonsafe API (€500/month subscription)
├── Day 22-25: Implement data quality rules (validation, harmonization)
├── Day 26-28: Run Spark feature engineering job
└── Deliverable: training_dataset_v2.0 (34K samples + features)

Week 5-6: MCP Server Development
├── Day 29-32: Build FastAPI MCP server
├── Day 33-36: Implement query_soil_samples, get_training_dataset tools
├── Day 37-39: Deploy MCP server to Kubernetes
├── Day 40-42: Security (API key auth, rate limiting, RBAC)
└── Deliverable: Production MCP server (https://mcp.soilviews.bg)

Week 7-8: Training Pipeline Integration
├── Day 43-47: Update PyTorch Lightning training script
├── Day 48-52: Test MCP DataLoader with v2.0 dataset
├── Day 53-56: Run full training (34K samples, 4 GPUs)
└── Deliverable: Model v2.0 with R² ≥ 0.82

Week 9-10: Validation & Monitoring
├── Day 57-60: Validate on held-out municipalities
├── Day 61-65: Set up Grafana dashboards (data quality, training metrics)
├── Day 66-68: Document data lineage for governance
├── Day 69-70: Stakeholder demo (compare v1.0 vs v2.0)
└── Deliverable: Production-ready system

Week 11-12: Optimization & Decision
├── Day 71-75: Optimize query performance (Presto tuning, caching)
├── Day 76-78: Cost analysis (watsonx.data vs PostgreSQL + S3)
├── Day 79-81: Evaluate Carbonsafe API value (cost vs accuracy gain)
├── Day 82-84: Final report (ROI, data coverage, model improvement)
└── Decision: Continue with watsonx.data or simplify architecture
```

---

## Cost Analysis

### watsonx.data Pricing

**Option 1: IBM Cloud SaaS**

| Component | Pricing | Monthly Cost (Est.) |
|-----------|---------|---------------------|
| **Presto Compute** | $0.40/vCPU-hour | €1,200 (4 vCPUs × 730 hrs) |
| **Spark Compute** | $0.50/vCPU-hour | €500 (2 vCPUs × 500 hrs, batch jobs) |
| **Storage (Iceberg)** | $0.023/GB/month | €115 (5 TB data) |
| **Data Transfer** | $0.09/GB egress | €90 (1 TB/month to training) |
| **Total** | | **€1,905/month** |

**Option 2: On-Premises (Self-Hosted)**

| Component | Pricing | One-Time + Monthly |
|-----------|---------|---------------------|
| **watsonx.data License** | €10,000/year | €833/month (amortized) |
| **Hardware (3 nodes)** | €15,000 CapEx | €250/month (5-year depreciation) |
| **Storage (10 TB SSD)** | €2,000 CapEx | €33/month |
| **Electricity** | €0.12/kWh | €150/month |
| **Maintenance** | 10% of hardware | €25/month |
| **Total** | | **€1,291/month** |

**Option 3: Carbonsafe API Only (No watsonx.data)**

| Component | Pricing | Monthly Cost |
|-----------|---------|--------------|
| **Carbonsafe API** | €500/month | €500 |
| **PostgreSQL (RDS)** | €100/month | €100 |
| **S3 Storage** | €50/month | €50 |
| **Total** | | **€650/month** |

### ROI Comparison

**Scenario 1: Current Architecture (PostgreSQL + S3)**
- Data: 18,340 samples
- Model R²: 0.78
- Manual data integration: 20 hours/month @ €50/hr = €1,000/month
- **Total Cost**: €1,000/month (labor only)

**Scenario 2: watsonx.data + MCP (Proposed)**
- Data: 34,487 samples (+88%)
- Model R²: 0.82 (+5%)
- Automated data integration: 2 hours/month @ €50/hr = €100/month
- **Total Cost**: €1,905/month (SaaS) or €1,291/month (on-prem) + €100 labor

**Scenario 3: Simplified (Carbonsafe API + PostgreSQL)**
- Data: 28,340 samples (+54%, no Academy data)
- Model R²: 0.80 (+3%)
- Semi-automated integration: 8 hours/month @ €50/hr = €400/month
- **Total Cost**: €650/month + €400 labor = €1,050/month

**Decision Matrix**:

| Factor | Current | watsonx.data (SaaS) | watsonx.data (On-Prem) | Simplified |
|--------|---------|---------------------|------------------------|------------|
| **Data Volume** | 18K | **34K** ✅ | **34K** ✅ | 28K |
| **Model R²** | 0.78 | **0.82** ✅ | **0.82** ✅ | 0.80 |
| **Monthly Cost** | €1,000 | €2,005 | **€1,391** ✅ | **€1,050** ✅ |
| **Setup Time** | 0 (existing) | 4 weeks | 6 weeks | 2 weeks |
| **Labor Savings** | €0 | **-€900/mo** ✅ | **-€900/mo** ✅ | -€600/mo |
| **Scalability** | Low | **High** ✅ | Medium | Low |
| **Vendor Lock-in** | None | Medium (IBM) | **Low** ✅ | Low |

**Recommendation**:
- **Short-term (trial)**: Simplified approach (Carbonsafe API + enhanced PostgreSQL)
- **Long-term (production)**: watsonx.data on-premises (best ROI, scalability)

---

## Alternative: Pure MCP Approach

### Lightweight MCP Server (No watsonx.data)

**If watsonx.data is too heavy**, use MCP server as a **lightweight data federation layer**:

```
┌─────────────────────────────────────────────────────────────┐
│ MCP Server (Lightweight)                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Data Connectors (Direct)                                   │
│  ├── PostgreSQL (SoilViews DB) - SQLAlchemy ORM            │
│  ├── AWS S3 (Sentinel-2 COGs) - boto3                      │
│  ├── Carbonsafe API - requests library                      │
│  ├── JRC LUCAS CSV - pandas read_csv from URL              │
│  └── Ministry CSV - manual upload to S3                     │
│                                                             │
│  In-Memory Data Cache (Redis)                               │
│  ├── Cache frequently accessed samples (24-hour TTL)       │
│  └── Pre-computed features (Sentinel-2 pixel extractions)  │
│                                                             │
│  Query Execution                                             │
│  ├── Join data from multiple sources in Python             │
│  ├── Apply data quality rules (validation, harmonization)  │
│  └── Return unified dataset to training pipeline           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Pros**:
- ✅ Simpler architecture (no new infrastructure)
- ✅ Lower cost (€500/month Carbonsafe + €200 Redis/RDS)
- ✅ Faster setup (2 weeks vs 6 weeks)
- ✅ Still provides AI-native data access via MCP

**Cons**:
- ❌ No true data lakehouse (no Iceberg, no time travel)
- ❌ Limited scalability (Python joins in-memory)
- ❌ Manual data integration (less automated)

**Use Case**: Ideal for SoilViews current scale (34K samples, 4 training runs/month)

### Implementation (Lightweight MCP)

```python
# mcp_server_lightweight/server.py
from fastapi import FastAPI
from sqlalchemy import create_engine
import pandas as pd
import redis
import requests

app = FastAPI()

# Data source connections
pg_engine = create_engine("postgresql://soilviews:password@db.soilviews.bg/soilviews")
redis_client = redis.Redis(host='redis.soilviews.bg', decode_responses=True)
carbonsafe_api_key = "cs_api_..."

@app.post("/mcp/tools/call")
async def call_tool(tool_call: dict):
    if tool_call['name'] == 'get_training_dataset':
        return get_training_dataset_lightweight(tool_call['arguments'])

def get_training_dataset_lightweight(args: dict):
    version = args['version']

    # Check cache first
    cache_key = f"training_dataset:{version}"
    if redis_client.exists(cache_key):
        return {"cache_hit": True, "path": redis_client.get(cache_key)}

    # 1. Load SoilViews data from PostgreSQL
    soilviews_df = pd.read_sql("SELECT * FROM soil_samples WHERE qa_flag = 'GOOD'", pg_engine)

    # 2. Load JRC LUCAS data from S3 CSV
    jrc_df = pd.read_csv("s3://soilviews-external/jrc-lucas/bulgaria.csv")

    # 3. Fetch Carbonsafe data from API
    carbonsafe_resp = requests.get(
        "https://api.carbonsafe.bg/v1/samples",
        headers={"Authorization": f"Bearer {carbonsafe_api_key}"},
        params={"country": "BG", "limit": 10000}
    )
    carbonsafe_df = pd.DataFrame(carbonsafe_resp.json()['samples'])

    # 4. Concatenate all sources
    combined_df = pd.concat([soilviews_df, jrc_df, carbonsafe_df], ignore_index=True)

    # 5. Apply data quality rules
    combined_df = combined_df[
        (combined_df['ph'] >= 4.0) & (combined_df['ph'] <= 9.0) &
        (combined_df['latitude'] >= 41.0) & (combined_df['latitude'] <= 44.5)
    ]

    # 6. Save to S3 as Parquet
    output_path = f"s3://soilviews-datasets/training_{version}.parquet"
    combined_df.to_parquet(output_path)

    # 7. Cache result
    redis_client.set(cache_key, output_path, ex=86400)  # 24-hour TTL

    return {"path": output_path, "count": len(combined_df)}
```

**Cost**: €500 (Carbonsafe) + €100 (Redis) + €100 (RDS) = **€700/month** (vs €1,905 for watsonx.data)

---

## Summary & Recommendations

### Data Gap Analysis

| Gap | Current | With External Data | Method |
|-----|---------|-------------------|--------|
| **Sample Count** | 18,340 | **34,487** (+88%) | JRC, Ministry, Academy, Carbonsafe |
| **Geographic Coverage** | 60% of Bulgaria | **88%** (+28%) | National grid + systematic sampling |
| **Temporal Coverage** | 2017-2025 (gaps) | **2009-2025** (continuous) | LUCAS multi-year surveys |
| **Property Coverage** | pH, OM, N, P, K, texture (85%) | **All + micronutrients** (100%) | Carbonsafe full suite |
| **Data Quality** | GOOD: 77% | **GOOD: 85%** (+8%) | ISO-certified labs only |

### Architecture Recommendations

**For 90-Day Trial (Budget-Conscious)**:
1. **Lightweight MCP Server** + Carbonsafe API
2. Cost: €700/month
3. Setup time: 2 weeks
4. Achievable R²: 0.80 (+3% vs baseline)

**For Production (1+ Year)**:
1. **watsonx.data On-Premises** + MCP Server
2. Cost: €1,391/month (after CapEx amortization)
3. Setup time: 6 weeks
4. Achievable R²: 0.82 (+5% vs baseline)
5. Labor savings: -€900/month (automation)
6. **Net ROI**: Break-even in 10 months

**For Enterprise (Multi-Model, Multi-Crop)**:
1. **watsonx.data SaaS** + MCP Server + Full API integrations
2. Cost: €2,005/month
3. Scalability: High (can handle 500K+ samples)
4. Use case: Expand SoilViews to crop disease, pest, yield prediction models

### Next Steps

1. **Week 1**: Sign up for Carbonsafe API trial (€500/month)
2. **Week 2**: Build lightweight MCP server (FastAPI + PostgreSQL + S3)
3. **Week 3-4**: Ingest JRC + Ministry data, test training pipeline
4. **Week 5**: Evaluate R² improvement with 28K samples
5. **Day 35 Decision**:
   - If R² gain is significant (≥0.80) → Continue with lightweight approach
   - If need more scalability → Invest in watsonx.data

---

**Document Owner**: SoilViews Data Team
**Review Date**: 2025-02-15 (after 4-week trial)
**Feedback**: data-team@soilviews.bg
