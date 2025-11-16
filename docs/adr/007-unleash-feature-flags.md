# ADR-007: Unleash for Feature Flags and Gradual Rollout

## Status

Accepted

## Context

SoilViews will launch incrementally across Bulgarian municipalities to:

1. **Validate accuracy** in different soil/climate zones
2. **Manage server load** (avoid overwhelming infrastructure)
3. **Gather feedback** before national rollout
4. **A/B test features** (e.g., VRA prescription algorithms)
5. **Kill switches** for problematic features

### Requirements

- **Granular Targeting**: Enable features per municipality, organization, or user
- **Dynamic Updates**: Toggle features without redeploying application
- **Audit Trail**: Track who enabled/disabled what and when
- **A/B Testing**: Gradual rollout (e.g., 10% → 50% → 100%)
- **Client + Server**: Flags evaluated in both React frontend and NestJS API
- **Low Latency**: < 10 ms flag evaluation
- **Self-Hosted**: GDPR compliance requires EU data residency

### Options Considered

1. **Environment Variables** (simple boolean flags)
2. **Database Table** (custom implementation)
3. **LaunchDarkly** (SaaS, commercial)
4. **Unleash** (open-source, self-hosted)
5. **Flagsmith** (open-source, SaaS option)
6. **GrowthBook** (open-source, A/B testing focused)

## Decision

We will use **Unleash** (open-source feature flag platform) deployed on our own
infrastructure.

## Rationale

### Comparison of Solutions

| Solution         | Cost      | Hosting   | UI     | SDK Support | Targeting | Choice      |
| ---------------- | --------- | --------- | ------ | ----------- | --------- | ----------- |
| Env Vars         | Free      | N/A       | None   | N/A         | None      | Too simple  |
| Custom DB        | Free      | Self      | Custom | Manual      | Custom    | High effort |
| LaunchDarkly     | €50/mo    | SaaS      | ✅      | ✅          | ✅        | Too expensive|
| **Unleash**      | **Free**  | **Self**  | **✅**  | **✅**      | **✅**    | **Selected**|
| Flagsmith        | Free/SaaS | Both      | ✅      | ✅          | ✅        | Alternative |
| GrowthBook       | Free      | Self      | ✅      | ⚠️ Limited  | ✅        | A/B only    |

**Unleash** offers the best balance of:

- **Open Source**: No vendor lock-in, full control
- **Feature-Rich**: Gradual rollout, A/B testing, user targeting
- **SDK Support**: Node.js, React, Python (for all our packages)
- **Self-Hosted**: GDPR-compliant (data stays in EU)
- **Proven**: Used by NAV (Norwegian government), Finn.no

### Unleash Architecture

```
┌─────────────────────────────────────────────┐
│          Unleash Admin UI                   │
│  (Product team manages flags)               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│          Unleash Server (Node.js)           │
│  - PostgreSQL (flag definitions)            │
│  - REST API (flag evaluation)               │
│  - Webhooks (change notifications)          │
└─────────────────┬───────────────────────────┘
                  │
          ┌───────┴────────┐
          ▼                ▼
┌──────────────────┐  ┌──────────────────┐
│   NestJS API     │  │   React Web      │
│  (Unleash SDK)   │  │  (Unleash SDK)   │
│  Server-side     │  │  Client-side     │
│  evaluation      │  │  evaluation      │
└──────────────────┘  └──────────────────┘
```

**Evaluation Flow**:

1. SDKs fetch flag definitions on startup (cached locally)
2. Polling interval: 15 seconds (configurable)
3. Flags evaluated **in-memory** (< 1 ms, no network latency)
4. SDKs send usage metrics back to Unleash (for analytics)

### Use Cases for SoilViews

#### 1. Municipality-Based Rollout

**Scenario**: Launch in Parvomay (pilot municipality) before national rollout.

**Strategy**: Custom strategy `municipality`

```typescript
// Unleash custom strategy
{
  name: 'municipality',
  parameters: {
    municipalities: 'Parvomay,Plovdiv,Sofia'  // Comma-separated list
  }
}

// Application code
const context = {
  userId: user.id,
  properties: {
    municipality: user.organization.municipality  // 'Parvomay'
  }
};

if (unleash.isEnabled('soil-maps', context)) {
  // Show soil map feature
}
```

#### 2. Gradual Rollout (Percentage-Based)

**Scenario**: New VRA algorithm → 10% of users → 50% → 100%

**Strategy**: Built-in `gradualRolloutUserId`

```typescript
// Unleash configuration
{
  name: 'vra-algorithm-v2',
  strategies: [
    {
      name: 'gradualRolloutUserId',
      parameters: {
        percentage: '10',  // Start with 10%
        groupId: 'vra-v2'
      }
    }
  ]
}

// Application code
if (unleash.isEnabled('vra-algorithm-v2')) {
  return new VRAAlgorithmV2().generate(field);
} else {
  return new VRAAlgorithmV1().generate(field);  // Fallback
}
```

#### 3. Kill Switch for Problematic Features

**Scenario**: Sentinel-Hub API is down → disable soil map generation

```typescript
// Emergency toggle (via Unleash UI, no deployment needed)
{
  name: 'enable-soil-map-generation',
  enabled: false  // Disabled globally
}

// API endpoint
if (!unleash.isEnabled('enable-soil-map-generation')) {
  throw new ServiceUnavailableException('Soil map generation temporarily disabled');
}
```

#### 4. Beta Features for Internal Testers

**Scenario**: Insurance module in beta → only for `@soilviews.bg` emails

**Strategy**: Custom strategy `emailDomain`

```typescript
// Strategy definition
{
  name: 'insurance-module-beta',
  strategies: [
    {
      name: 'userWithId',
      parameters: {
        userIds: 'admin@soilviews.bg,tester@soilviews.bg'
      }
    }
  ]
}
```

## Implementation

### Backend (NestJS)

```typescript
// unleash.module.ts
import { Module, Global } from '@nestjs/common';
import { initialize, Unleash } from 'unleash-client';

@Global()
@Module({
  providers: [
    {
      provide: 'UNLEASH',
      useFactory: async (): Promise<Unleash> => {
        const unleash = initialize({
          url: process.env.UNLEASH_URL,
          appName: 'soilviews-api',
          environment: process.env.NODE_ENV,
          customHeaders: {
            Authorization: process.env.UNLEASH_API_KEY,
          },
        });

        await unleash.start();
        return unleash;
      },
    },
  ],
  exports: ['UNLEASH'],
})
export class UnleashModule {}

// Example usage in service
@Injectable()
export class MapsService {
  constructor(@Inject('UNLEASH') private unleash: Unleash) {}

  async createSoilMap(fieldId: string, userId: string): Promise<SoilMap> {
    const context = {
      userId,
      properties: {
        municipality: await this.getUserMunicipality(userId),
      },
    };

    if (!this.unleash.isEnabled('soil-maps', context)) {
      throw new ForbiddenException('Soil maps not enabled for your region');
    }

    // Proceed with map generation
  }
}
```

### Frontend (React)

```typescript
// UnleashProvider.tsx
import { FlagProvider } from '@unleash/proxy-client-react';

export function UnleashProvider({ children }: { children: React.ReactNode }) {
  const config = {
    url: import.meta.env.VITE_UNLEASH_PROXY_URL,
    clientKey: import.meta.env.VITE_UNLEASH_CLIENT_KEY,
    appName: 'soilviews-web',
    refreshInterval: 15,
    context: {
      userId: user?.id,
      properties: {
        municipality: user?.organization.municipality,
      },
    },
  };

  return <FlagProvider config={config}>{children}</FlagProvider>;
}

// Component.tsx
import { useFlag } from '@unleash/proxy-client-react';

export function SoilMapLayer() {
  const soilMapsEnabled = useFlag('soil-maps');

  if (!soilMapsEnabled) {
    return <div>Soil maps coming soon to your region!</div>;
  }

  return <MapLibreLayer source="soil-ph" />;
}
```

### Docker Compose (Local Dev)

```yaml
# infra/docker-compose.dev.yml
services:
  unleash:
    image: unleashorg/unleash-server:5.7
    ports:
      - '4242:4242'
    environment:
      DATABASE_URL: postgres://unleash:unleash@postgres/unleash
      DATABASE_SSL: 'false'
      INIT_ADMIN_API_TOKENS: 'admin-token:admin.secret'
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: unleash
      POSTGRES_USER: unleash
      POSTGRES_PASSWORD: unleash
```

## Consequences

### Positive

- ✅ **Zero Downtime Rollouts**: Toggle features without redeploying
- ✅ **Gradual Validation**: Test in one municipality before nationwide
- ✅ **A/B Testing**: Measure impact of VRA algorithm improvements
- ✅ **Risk Mitigation**: Instant kill switch for broken features
- ✅ **GDPR Compliant**: Self-hosted, data in EU
- ✅ **Audit Trail**: Track all flag changes (who, when, why)

### Negative

- ❌ **Operational Overhead**: Need to run Unleash server + PostgreSQL
- ❌ **Code Complexity**: Feature flag checks scattered in codebase
- ❌ **Technical Debt**: Old flags must be removed after rollout

### Mitigation

- **Infrastructure**: Unleash runs in same EKS cluster (minimal overhead)
- **Flag Hygiene**: Monthly review to remove stale flags
- **Documentation**: ADR-007 explains flag usage patterns

## Alternatives Considered

### Environment Variables

**Pros**: Simple, no infrastructure
**Cons**: Require redeployment, no gradual rollout, no user targeting

### Custom Database Table

**Pros**: Full control, no dependencies
**Cons**: Need to build UI, SDKs, metrics (months of work)

### LaunchDarkly

**Pros**: Best-in-class UI, enterprise features
**Cons**: €600+/year, GDPR concerns (US-based SaaS)

## References

- [Unleash Documentation](https://docs.getunleash.io/)
- [Unleash GitHub](https://github.com/Unleash/unleash)
- [Feature Toggles (Martin Fowler)](https://martinfowler.com/articles/feature-toggles.html)
- [Unleash Node.js SDK](https://github.com/Unleash/unleash-client-node)
- [Unleash React SDK](https://github.com/Unleash/proxy-client-react)

## Revision History

- 2025-01-16: Initial draft (Accepted)
