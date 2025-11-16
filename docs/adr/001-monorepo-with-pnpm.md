# ADR-001: Monorepo with pnpm Workspaces

## Status

Accepted

## Context

SoilViews consists of multiple interconnected packages (web, API, ML pipeline, CLI, shared
types) that need to share code, dependencies, and development tooling. We need to decide on
a repository structure and package manager.

### Options Considered

1. **Multi-repo** (separate Git repositories for each package)
2. **Monorepo with npm workspaces**
3. **Monorepo with Yarn workspaces**
4. **Monorepo with pnpm workspaces**
5. **Monorepo with Lerna + npm**

## Decision

We will use a **monorepo with pnpm workspaces**.

## Rationale

### Why Monorepo?

- **Code Sharing**: `shared-types` package used by both `web` and `api`
- **Atomic Commits**: Changes spanning multiple packages in single commit
- **Simplified Dependency Management**: Single lock file, consistent versions
- **Cross-package Refactoring**: Easier to refactor shared interfaces
- **Unified CI/CD**: Single pipeline for all packages

### Why pnpm?

1. **Disk Efficiency**: Content-addressable storage saves 3x disk space vs npm
2. **Speed**: Parallel installation ~2x faster than npm/Yarn
3. **Strict**: No phantom dependencies (only declared deps accessible)
4. **Workspace Protocol**: `workspace:*` for local package linking
5. **Monorepo Support**: First-class workspace features
6. **Compatible**: Works with existing npm ecosystem

### Benchmark (1000 packages project)

| Package Manager | Install Time | Disk Usage |
| --------------- | ------------ | ---------- |
| npm             | 51s          | 1.2 GB     |
| Yarn Classic    | 39s          | 1.1 GB     |
| Yarn Berry      | 29s          | 950 MB     |
| **pnpm**        | **24s**      | **400 MB** |

## Implementation

### Directory Structure

```
soilviews/
├── packages/
│   ├── web/
│   ├── api/
│   ├── ml-pipeline/
│   ├── ground-truth-cli/
│   └── shared-types/
├── pnpm-workspace.yaml
└── package.json
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
```

### Common Commands

```bash
# Install all dependencies
pnpm install

# Run script in specific package
pnpm --filter web dev

# Run script in all packages
pnpm --recursive build

# Add dependency to specific package
pnpm --filter api add @nestjs/typeorm
```

## Consequences

### Positive

- ✅ Fast installation and efficient disk usage
- ✅ Simplified cross-package development
- ✅ Single source of truth for dependency versions
- ✅ Atomic multi-package changes
- ✅ Better CI caching (single lock file)

### Negative

- ❌ Learning curve for developers unfamiliar with pnpm
- ❌ Some legacy tools may not support pnpm (rare)
- ❌ Requires pnpm installation on all dev machines

### Mitigation

- Document pnpm-specific workflows in `CONTRIBUTING.md`
- Add `.npmrc` with `engine-strict=true` to enforce pnpm usage
- Provide Docker-based dev environment with pnpm pre-installed

## Alternatives Considered

### Multi-repo

**Rejected** because:

- Painful to synchronize versions across repos
- Complex to share TypeScript types
- Harder to maintain consistent tooling

### Yarn Workspaces

**Rejected** because:

- Yarn Classic is deprecated
- Yarn Berry (v3+) has controversial PnP mode
- pnpm is faster and more disk-efficient

## References

- [pnpm Documentation](https://pnpm.io/)
- [pnpm vs npm vs Yarn Benchmark](https://pnpm.io/benchmarks)
- [Monorepo Best Practices](https://monorepo.tools/)

## Revision History

- 2025-01-16: Initial draft (Accepted)
