# SoilViews System Architecture

## Table of Contents

- [Overview](#overview)
- [C4 Model Diagrams](#c4-model-diagrams)
- [Technology Stack](#technology-stack)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Scalability Considerations](#scalability-considerations)

---

## Overview

SoilViews is a cloud-native, multi-tenant SaaS platform designed for precision agriculture
in Bulgaria. The system architecture follows microservices principles with clear separation
of concerns:

- **Frontend (Web)**: React SPA with MapLibre GL JS for geospatial visualization
- **Backend (API)**: NestJS REST API with PostgreSQL/PostGIS persistence
- **ML Pipeline**: PyTorch Lightning training + AWS Lambda serverless inference
- **Data Pipeline**: Sentinel-Hub integration for Earth Observation data acquisition
- **Storage**: S3-compatible object storage for Cloud-Optimized GeoTIFFs (COGs)

---

## C4 Model Diagrams

### Level 1: System Context

```mermaid
graph TB
    Farmer[👨‍🌾 Farmer<br/>Web Browser]
    Agronomist[👨‍🔬 Agronomist<br/>Web Browser + CLI]
    Insurance[🏢 Insurance Company<br/>API Integration]

    SoilViews[SoilViews Platform<br/>Multi-tenant SaaS]

    SentinelHub[Sentinel Hub<br/>Copernicus Data]
    BulgarianEID[Bulgarian eID<br/>eIDAS SSO]
    EmailService[Email Service<br/>SMTP]

    Farmer --> SoilViews
    Agronomist --> SoilViews
    Insurance --> SoilViews

    SoilViews --> SentinelHub
    SoilViews --> BulgarianEID
    SoilViews --> EmailService

    style SoilViews fill:#1e88e5,stroke:#0d47a1,color:#fff
    style SentinelHub fill:#43a047,stroke:#2e7d32,color:#fff
    style BulgarianEID fill:#f57c00,stroke:#e65100,color:#fff
```

### Level 2: Container Diagram

```mermaid
graph TB
    subgraph "User Devices"
        Browser[Web Browser<br/>React SPA]
        CLI[Ground-Truth CLI<br/>Python]
    end

    subgraph "SoilViews Platform"
        WebApp[Web Application<br/>React + Vite + MapLibre<br/>Port: 5173]
        API[API Application<br/>NestJS + TypeORM<br/>Port: 3000]
        TileServer[Tile Server<br/>TiTiler<br/>Port: 8000]
        MLInference[ML Inference<br/>AWS Lambda<br/>PyTorch]

        Cache[(Redis Cache<br/>Session + Tiles)]
        DB[(PostgreSQL + PostGIS<br/>Relational Data)]
        S3[(S3/MinIO<br/>COG Storage)]
        STAC[(pgSTAC<br/>Raster Catalog)]
    end

    subgraph "External Services"
        SH[Sentinel Hub API]
        Auth[eIDAS Identity Provider]
    end

    Browser --> WebApp
    CLI --> API
    WebApp --> API
    WebApp --> TileServer
    API --> Cache
    API --> DB
    API --> S3
    API --> MLInference
    API --> SH
    API --> Auth
    TileServer --> S3
    DB --> STAC
    STAC --> S3
    MLInference --> S3

    style WebApp fill:#42a5f5,stroke:#1976d2,color:#fff
    style API fill:#66bb6a,stroke:#388e3c,color:#fff
    style TileServer fill:#ffa726,stroke:#f57c00,color:#fff
    style MLInference fill:#ab47bc,stroke:#7b1fa2,color:#fff
```

### Level 3: Component Diagram (API Application)

```mermaid
graph TB
    subgraph "API Application (NestJS)"
        AuthModule[Auth Module<br/>JWT + eIDAS SAML]
        UsersModule[Users Module<br/>User Management]
        OrgsModule[Organizations Module<br/>Multi-tenancy]
        FieldsModule[Fields Module<br/>Parcel CRUD]
        SurveysModule[Surveys Module<br/>Ground-Truth Data]
        MapsModule[Maps Module<br/>Soil Property Maps]
        PrescriptionsModule[Prescriptions Module<br/>VRA Generation]
        InsuranceModule[Insurance Module<br/>Risk + Anomalies]
        SentinelHubModule[Sentinel-Hub Module<br/>EO Data Fetcher]

        Common[Common Module<br/>Guards, Pipes, Filters]
    end

    AuthModule --> UsersModule
    OrgsModule --> UsersModule
    FieldsModule --> OrgsModule
    SurveysModule --> FieldsModule
    MapsModule --> FieldsModule
    MapsModule --> SentinelHubModule
    MapsModule -.ML Inference.-> MLService[ML Service]
    PrescriptionsModule --> MapsModule
    InsuranceModule --> MapsModule
    InsuranceModule --> SentinelHubModule

    Common --> AuthModule
    Common --> FieldsModule
    Common --> MapsModule

    style AuthModule fill:#ef5350,stroke:#c62828,color:#fff
    style SentinelHubModule fill:#66bb6a,stroke:#388e3c,color:#fff
    style MapsModule fill:#42a5f5,stroke:#1976d2,color:#fff
    style PrescriptionsModule fill:#ffa726,stroke:#f57c00,color:#fff
    style InsuranceModule fill:#ab47bc,stroke:#7b1fa2,color:#fff
```

---

## Technology Stack

### Frontend

| Layer               | Technology                 | Purpose                              |
| ------------------- | -------------------------- | ------------------------------------ |
| Framework           | React 18                   | UI component library                 |
| Build Tool          | Vite                       | Fast HMR & optimized production      |
| Language            | TypeScript 5.3             | Type safety                          |
| State Management    | React Query + Zustand      | Server state + client state          |
| Routing             | React Router 6             | SPA navigation                       |
| Maps                | MapLibre GL JS             | WebGL raster + vector rendering      |
| UI Components       | shadcn/ui + Tailwind       | Accessible component library         |
| Forms               | React Hook Form + Zod      | Form validation                      |
| Internationalization| i18next                    | Bulgarian/English localization       |
| Charts              | Recharts                   | Data visualization                   |

### Backend

| Layer           | Technology          | Purpose                            |
| --------------- | ------------------- | ---------------------------------- |
| Framework       | NestJS 10           | Enterprise Node.js framework       |
| Language        | TypeScript 5.3      | Type safety                        |
| ORM             | TypeORM 0.3         | Database abstraction               |
| Database        | PostgreSQL 16       | Relational data                    |
| Spatial Ext.    | PostGIS 3.4         | Geospatial queries                 |
| Cache           | Redis 7             | Session, rate limiting, tile cache |
| Auth            | Passport (JWT+SAML) | Authentication & authorization     |
| Validation      | class-validator     | DTO validation                     |
| API Docs        | Swagger/OpenAPI 3.1 | Auto-generated documentation       |
| Queue           | Bull (Redis)        | Background job processing          |
| File Storage    | AWS SDK (S3)        | Object storage abstraction         |

### ML Pipeline

| Layer            | Technology               | Purpose                         |
| ---------------- | ------------------------ | ------------------------------- |
| Framework        | PyTorch Lightning 2.1    | Training orchestration          |
| Model Arch       | EfficientNet-b3          | CNN encoder (ImageNet pretrain) |
| Segmentation     | DeepLabV3+               | Dense prediction head           |
| Geospatial I/O   | GDAL 3.8, rasterio       | COG reading/writing             |
| Data Processing  | NumPy, xarray, geopandas | Array manipulation              |
| Experiment Track | Weights & Biases         | Hyperparameter tuning           |
| Inference        | TorchScript + ONNX       | Optimized production models     |
| Serverless       | AWS Lambda (ARM)         | On-demand inference             |

### Infrastructure

| Layer          | Technology        | Purpose                       |
| -------------- | ----------------- | ----------------------------- |
| Containerization | Docker          | Application packaging         |
| Orchestration  | Kubernetes (EKS)  | Container orchestration       |
| IaC            | Terraform         | Infrastructure provisioning   |
| Package Mgmt   | Helm 3            | Kubernetes deployments        |
| CI/CD          | GitHub Actions    | Automated pipelines           |
| Monitoring     | CloudWatch        | Logs, metrics, alarms         |
| Tracing        | OpenTelemetry     | Distributed tracing           |
| Tile Server    | TiTiler (FastAPI) | Dynamic COG tiling            |
| Object Storage | S3 / MinIO        | COG storage                   |
| CDN            | CloudFront        | Static asset + tile caching   |

---

## Data Flow

### 1. Soil Property Map Generation

```mermaid
sequenceDiagram
    participant F as Farmer
    participant W as Web App
    participant A as API
    participant SH as Sentinel Hub
    participant S3 as S3 Storage
    participant L as Lambda (ML)
    participant DB as PostgreSQL

    F->>W: Request soil map for field
    W->>A: POST /api/maps (fieldId, dateRange)
    A->>SH: Fetch bare-soil composite
    SH-->>A: Sentinel-2 L2A imagery
    A->>S3: Store raw imagery (COG)
    A->>L: Trigger inference (S3 key)
    L->>S3: Load image + model
    L->>L: Run EfficientNet-b3 prediction
    L-->>A: Return predictions (GeoJSON)
    A->>S3: Store prediction COG
    A->>DB: Insert map metadata
    A-->>W: Return map ID + tile URL
    W->>TileServer: Request map tiles (XYZ)
    TileServer->>S3: Fetch COG chunks
    TileServer-->>W: PNG tiles
    W->>F: Display soil map
```

### 2. VRA Prescription Workflow

```mermaid
sequenceDiagram
    participant F as Farmer
    participant A as API
    participant DB as PostgreSQL
    participant VRA as VRA Engine
    participant S3 as S3 Storage

    F->>A: POST /api/prescriptions<br/>{fieldId, cropType, targetYield}
    A->>DB: Fetch field geometry
    A->>DB: Fetch latest soil map
    A->>VRA: Generate prescription<br/>(soilData, cropType)
    VRA->>VRA: Calculate fertilizer rates<br/>(N/P/K kg/ha)
    VRA->>VRA: Create management zones
    VRA->>S3: Store prescription COG
    VRA->>VRA: Convert to Shapefile + ISOBUS XML
    VRA-->>A: Prescription URLs
    A->>DB: Insert prescription record
    A-->>F: Download links (SHP, XML, PDF)
```

### 3. Ground-Truth Data Ingestion

```mermaid
sequenceDiagram
    participant Agro as Agronomist
    participant CLI as Ground-Truth CLI
    participant A as API
    participant Q as Redis Queue
    participant W as Worker
    participant DB as PostgreSQL

    Agro->>CLI: upload-survey survey.csv
    CLI->>CLI: Validate schema (ISO 28258)
    CLI->>A: POST /api/surveys/upload
    A->>A: Quality gate checks
    A->>DB: Insert survey records
    A->>Q: Enqueue model retraining job
    A-->>CLI: Survey ID
    CLI-->>Agro: Upload successful

    Note over Q,W: Background Processing
    W->>Q: Dequeue retraining job
    W->>DB: Fetch new training data
    W->>W: Trigger ML pipeline
    W->>S3: Save updated model.pth
    W->>DB: Update model version
```

---

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web App
    participant A as API
    participant eID as eIDAS IdP
    participant DB as PostgreSQL

    alt eIDAS Login
        U->>W: Click "Login with eID"
        W->>A: GET /auth/eidas/login
        A->>eID: SAML AuthnRequest
        eID-->>U: Redirect to eID portal
        U->>eID: Authenticate (smart card)
        eID->>A: SAML Response (signed)
        A->>A: Validate signature
        A->>DB: Find or create user
        A-->>W: JWT + Refresh Token
    else Email/Password
        U->>W: Submit credentials
        W->>A: POST /auth/login
        A->>DB: Verify password (bcrypt)
        A-->>W: JWT + Refresh Token
    end

    W->>W: Store tokens (httpOnly cookie)
    W->>A: Subsequent requests<br/>Authorization: Bearer {JWT}
```

### Authorization Model

```
┌─────────────────────────────────────────┐
│         Role-Based Access Control       │
├─────────────┬───────────────────────────┤
│ Role        │ Permissions               │
├─────────────┼───────────────────────────┤
│ SUPER_ADMIN │ All permissions           │
│ ORG_ADMIN   │ Manage org users + fields │
│ AGRONOMIST  │ Upload surveys, create    │
│             │ maps + prescriptions      │
│ FARMER      │ View own fields, download │
│             │ prescriptions             │
│ VIEWER      │ Read-only access          │
└─────────────┴───────────────────────────┘
```

**Multi-tenancy Isolation:**

- Row-Level Security (RLS) in PostgreSQL
- Every query filtered by `organizationId`
- S3 bucket prefixes per organization
- Redis cache keys namespaced by org

### Data Protection

- **At Rest**: AES-256 encryption (RDS, S3)
- **In Transit**: TLS 1.3 for all connections
- **Secrets**: AWS Secrets Manager / HashiCorp Vault
- **PII**: Pseudonymization for GDPR compliance
- **Audit Logs**: Immutable append-only table

---

## Deployment Architecture

### AWS Production Architecture

```mermaid
graph TB
    subgraph "Edge"
        CF[CloudFront CDN<br/>Static + Tiles]
        WAF[AWS WAF<br/>DDoS Protection]
    end

    subgraph "VPC - eu-central-1"
        subgraph "Public Subnets"
            ALB[Application Load Balancer]
            NAT[NAT Gateway]
        end

        subgraph "Private Subnets - AZ1"
            EKS1[EKS Worker Nodes<br/>API + TiTiler]
            RDS1[(RDS PostgreSQL<br/>Primary)]
        end

        subgraph "Private Subnets - AZ2"
            EKS2[EKS Worker Nodes<br/>API + TiTiler]
            RDS2[(RDS PostgreSQL<br/>Standby)]
        end

        subgraph "Private Subnets - AZ3"
            Redis[(ElastiCache Redis)]
        end
    end

    subgraph "Serverless"
        Lambda[Lambda Functions<br/>ML Inference]
        EFS[EFS<br/>Model Cache]
    end

    subgraph "Storage"
        S3[S3 Bucket<br/>COG Storage]
    end

    subgraph "Monitoring"
        CW[CloudWatch<br/>Logs + Metrics]
        SNS[SNS<br/>Alerts]
    end

    CF --> WAF
    WAF --> ALB
    ALB --> EKS1
    ALB --> EKS2
    EKS1 --> RDS1
    EKS2 --> RDS1
    RDS1 -.Replication.-> RDS2
    EKS1 --> Redis
    EKS2 --> Redis
    EKS1 --> S3
    EKS2 --> S3
    EKS1 --> Lambda
    EKS2 --> Lambda
    Lambda --> EFS
    Lambda --> S3
    EKS1 --> NAT
    EKS2 --> NAT
    EKS1 --> CW
    Lambda --> CW
    CW --> SNS

    style CF fill:#ff9800,stroke:#f57c00,color:#fff
    style ALB fill:#42a5f5,stroke:#1976d2,color:#fff
    style Lambda fill:#ab47bc,stroke:#7b1fa2,color:#fff
    style S3 fill:#66bb6a,stroke:#388e3c,color:#fff
```

### Environment Strategy

| Environment | Purpose               | Infrastructure         | Cost    |
| ----------- | --------------------- | ---------------------- | ------- |
| Development | Local dev (Docker)    | docker-compose         | €0/mo   |
| Staging     | Pre-production tests  | EKS t3.medium x 2      | €150/mo |
| Production  | Live traffic          | EKS m5.large x 3 + RDS | €800/mo |

---

## Scalability Considerations

### Horizontal Scaling

- **API Pods**: HorizontalPodAutoscaler (CPU > 70% → scale up)
- **TiTiler**: Separate deployment with aggressive caching
- **PostgreSQL**: Read replicas for reporting queries
- **Lambda**: Concurrent execution limit (default: 1000)

### Database Optimization

- **Partitioning**: `fields`, `surveys`, `maps` by `crop_year`
- **Indexing**: GiST on geometry columns, B-tree on foreign keys
- **Connection Pooling**: pgBouncer (transaction mode)
- **Query Caching**: Redis for frequently accessed aggregations

### Cost Optimization

- **Spot Instances**: 70% of EKS nodes (non-critical workloads)
- **S3 Lifecycle**: COGs > 90 days → Intelligent-Tiering
- **Lambda Reserved Concurrency**: Prevent runaway costs
- **CloudFront**: Reduce origin requests by 80%

### Performance Targets

| Metric                   | Target   | Measurement                         |
| ------------------------ | -------- | ----------------------------------- |
| API P95 Response Time    | < 200 ms | CloudWatch Insights                 |
| Map Tile Load Time       | < 500 ms | Browser Performance API             |
| ML Inference (1 field)   | < 30 s   | Lambda duration metric              |
| Database Query P99       | < 100 ms | pg_stat_statements                  |
| Uptime                   | 99.9%    | StatusPage.io                       |

---

## Disaster Recovery

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 15 minutes
- **Backup Strategy**:
  - RDS automated snapshots (daily, 7-day retention)
  - S3 versioning + cross-region replication
  - PostgreSQL WAL archiving to S3
- **Restore Procedure**: Documented in `docs/deployment/disaster-recovery.md`

---

## References

- Architecture Decision Records: [docs/adr/](../adr/)
- API Documentation: [docs/api.md](./api.md)
- Deployment Guide: [SOILVIEWS_DEPLOYMENT.md](../SOILVIEWS_DEPLOYMENT.md)
