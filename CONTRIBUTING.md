# Contributing to SoilViews

Thank you for your interest in contributing to SoilViews! This document provides guidelines
and instructions for setting up your development environment and contributing to the
project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Code Style](#code-style)
- [Documentation](#documentation)

---

## Code of Conduct

This project adheres to a code of conduct that promotes a welcoming and inclusive
environment. By participating, you are expected to uphold this code. Please report
unacceptable behavior to conduct@soilviews.bg.

---

## Development Setup

### Prerequisites

- **Node.js** ≥ 20.0.0 ([download](https://nodejs.org/))
- **pnpm** ≥ 8.0.0 (`npm install -g pnpm`)
- **Docker** & **Docker Compose** ([download](https://www.docker.com/))
- **Python** ≥ 3.11 (for ML pipeline)
- **Git** ([download](https://git-scm.com/))

### Initial Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/soilviews.git
cd soilviews

# 2. Install dependencies
pnpm install

# 3. Copy environment configuration
cp .env.example .env

# 4. Start local infrastructure
docker-compose -f infra/docker-compose.dev.yml up -d

# Wait for services to be healthy (PostgreSQL, Redis, MinIO)
docker-compose -f infra/docker-compose.dev.yml ps

# 5. Run database migrations
pnpm db:migrate

# 6. Seed sample data (optional)
pnpm db:seed

# 7. Install pre-commit hooks
pnpm prepare

# 8. Start development servers
pnpm dev
```

**Verify setup:**

- Frontend: http://localhost:5173
- API: http://localhost:3000
- API Docs: http://localhost:3000/api/docs
- MinIO Console: http://localhost:9001 (login: minioadmin/minioadmin)

### Python ML Pipeline Setup

```bash
cd packages/ml-pipeline

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Verify installation
python -c "import torch; print(torch.__version__)"
```

---

## Project Structure

```
soilviews/
├── packages/
│   ├── web/                    # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── features/       # Feature-specific code
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utilities and helpers
│   │   │   └── pages/          # Route pages
│   │   ├── public/             # Static assets
│   │   └── package.json
│   │
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/           # Authentication module
│   │   │   ├── users/          # User management
│   │   │   ├── organizations/  # Multi-tenancy
│   │   │   ├── fields/         # Field parcels
│   │   │   ├── surveys/        # Ground-truth surveys
│   │   │   ├── maps/           # Soil property maps
│   │   │   ├── prescriptions/  # VRA prescriptions
│   │   │   ├── insurance/      # Insurance module
│   │   │   ├── sentinel-hub/   # EO data integration
│   │   │   └── common/         # Shared utilities
│   │   ├── test/               # E2E tests
│   │   └── package.json
│   │
│   ├── ml-pipeline/            # PyTorch training & inference
│   │   ├── configs/            # Training configurations
│   │   ├── data/               # Data loaders
│   │   ├── models/             # Model architectures
│   │   ├── scripts/            # Training scripts
│   │   └── inference/          # Serverless inference
│   │
│   ├── ground-truth-cli/       # CLI for survey uploads
│   │   ├── commands/
│   │   └── utils/
│   │
│   └── shared-types/           # Shared TypeScript types
│       ├── src/
│       └── python/             # Python type stubs
│
├── infra/
│   ├── docker-compose.*.yml    # Local development
│   ├── Dockerfile.*            # Multi-stage builds
│   ├── terraform/              # IaC for AWS
│   └── helm/                   # Kubernetes charts
│
├── scripts/
│   ├── seed-data/              # Sample data
│   └── benchmarks/             # Performance tests
│
└── docs/
    ├── adr/                    # Architecture Decision Records
    ├── api.md                  # API documentation
    ├── architecture.md         # System architecture
    └── research-citations.bib  # Research references
```

---

## Development Workflow

### Branch Naming Convention

- `feat/short-description` - New features
- `fix/short-description` - Bug fixes
- `docs/short-description` - Documentation updates
- `refactor/short-description` - Code refactoring
- `test/short-description` - Test additions or fixes
- `chore/short-description` - Maintenance tasks

### Workflow Steps

1. **Create a feature branch**

   ```bash
   git checkout -b feat/add-soil-texture-layer
   ```

2. **Make your changes**

   - Write code following our [style guidelines](#code-style)
   - Add tests for new functionality
   - Update documentation as needed

3. **Run tests and linters**

   ```bash
   pnpm lint          # Check code style
   pnpm type-check    # TypeScript type checking
   pnpm test          # Run unit tests
   pnpm test:e2e      # Run E2E tests (if applicable)
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat(api): add soil texture classification endpoint"
   ```

   See [Commit Conventions](#commit-conventions) for details.

5. **Push to your fork**

   ```bash
   git push origin feat/add-soil-texture-layer
   ```

6. **Open a Pull Request**
   - Use the PR template
   - Link related issues
   - Request review from maintainers

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) to automate versioning
and changelog generation.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons, etc.)
- `refactor` - Code refactoring (no functional changes)
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `build` - Build system changes
- `ci` - CI/CD pipeline changes
- `chore` - Maintenance tasks
- `revert` - Revert a previous commit

### Scopes

- `web` - Frontend changes
- `api` - Backend changes
- `ml-pipeline` - ML training/inference
- `ground-truth-cli` - CLI tool
- `shared-types` - Shared type definitions
- `infra` - Infrastructure changes
- `deps` - Dependency updates
- `config` - Configuration changes

### Examples

```bash
# Feature with scope
git commit -m "feat(api): add Sentinel-Hub bare-soil composite endpoint"

# Bug fix
git commit -m "fix(web): resolve MapLibre layer rendering issue on mobile"

# Documentation
git commit -m "docs: add deployment guide for AWS EKS"

# Breaking change
git commit -m "feat(api)!: migrate to TypeORM 0.3 (BREAKING CHANGE)"
```

### Pre-commit Hooks

Commits are automatically validated by:

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **commitlint** - Commit message validation
- **TypeScript** - Type checking

---

## Pull Request Process

### Before Submitting

- ✅ All tests pass (`pnpm test`)
- ✅ No linting errors (`pnpm lint`)
- ✅ Type checking passes (`pnpm type-check`)
- ✅ Code is formatted (`pnpm format`)
- ✅ Documentation is updated
- ✅ Commit messages follow conventions

### PR Template

When opening a PR, please include:

1. **Description** - What does this PR do?
2. **Motivation** - Why is this change needed?
3. **Related Issues** - Link to GitHub issues (e.g., `Closes #123`)
4. **Testing** - How was this tested?
5. **Screenshots** - For UI changes
6. **Checklist** - Confirm pre-submission requirements

### Review Process

1. Automated CI checks must pass
2. At least one maintainer approval required
3. All review comments must be resolved
4. PR must be up-to-date with `main` branch

### Merging

- PRs are merged using **squash and merge** strategy
- Commit message becomes the PR title
- Branch is automatically deleted after merge

---

## Testing Guidelines

### Unit Tests

- Place tests alongside source files (`*.test.ts`, `*.spec.ts`)
- Aim for **80%+ code coverage**
- Use descriptive test names

```typescript
// api/src/fields/fields.service.spec.ts
describe('FieldsService', () => {
  describe('calculateArea', () => {
    it('should calculate area in hectares for valid polygon', () => {
      // Test implementation
    });

    it('should throw error for invalid geometry', () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

- Test interactions between modules
- Use test database with migrations
- Clean up test data after each test

### E2E Tests

```typescript
// packages/web/cypress/e2e/soil-map.cy.ts
describe('Soil Map Workflow', () => {
  it('should load soil property layers', () => {
    cy.visit('/');
    cy.login('farmer@example.com', 'password');
    cy.get('[data-testid="layer-switcher"]').click();
    cy.get('[data-testid="layer-soil-ph"]').click();
    cy.get('[data-testid="map"]').should('contain', 'pH');
  });
});
```

### Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter api test

# Watch mode
pnpm --filter web test --watch

# Coverage report
pnpm --filter api test --coverage

# E2E tests
pnpm test:e2e
```

---

## Code Style

### TypeScript/JavaScript

- Use **TypeScript strict mode**
- Prefer **functional components** (React)
- Use **async/await** over callbacks
- Destructure props and imports
- Use **meaningful variable names**

```typescript
// ✅ Good
const { latitude, longitude } = coordinates;
const soilProperties = await fetchSoilData(fieldId);

// ❌ Bad
const lat = coordinates.latitude;
const data = await fetchSoilData(fieldId);
```

### Python

- Follow **PEP 8** style guide
- Use **type hints**
- Docstrings for all public functions
- Max line length: 100 characters

```python
# ✅ Good
def predict_soil_properties(
    image: np.ndarray,
    model: torch.nn.Module
) -> dict[str, float]:
    """
    Predict soil properties from Sentinel-2 image.

    Args:
        image: 8-band Sentinel-2 image (H, W, 8)
        model: Trained PyTorch model

    Returns:
        Dictionary of predicted soil properties
    """
    pass
```

### Formatting

All code is automatically formatted by Prettier (JS/TS) and Black (Python) via pre-commit
hooks.

```bash
# Manual formatting
pnpm format

# Check formatting without changes
pnpm format:check
```

---

## Documentation

### Code Comments

- **Explain "why", not "what"**
- Reference research papers with DOI/URL
- Use JSDoc for public APIs

```typescript
/**
 * Calculate NDVI from Sentinel-2 bands.
 *
 * @param red - Band 4 (665 nm)
 * @param nir - Band 8 (842 nm)
 * @returns Normalized Difference Vegetation Index (-1 to 1)
 *
 * @see https://doi.org/10.3390/agriculture-94-1-26
 * Reference: MDPI Agriculture 2025 yield prediction study
 */
export function calculateNDVI(red: number, nir: number): number {
  return (nir - red) / (nir + red);
}
```

### Architecture Decision Records (ADRs)

For significant architectural changes, create an ADR:

```bash
# Create new ADR
touch docs/adr/009-add-vector-tile-support.md
```

**Template:**

```markdown
# ADR-009: Add Vector Tile Support

## Status

Proposed

## Context

[Describe the problem and context]

## Decision

[Describe the solution]

## Consequences

[Describe positive and negative impacts]
```

### API Documentation

- OpenAPI/Swagger automatically generated from NestJS decorators
- Keep decorators up-to-date with code changes

```typescript
@ApiTags('fields')
@ApiResponse({ status: 200, description: 'Field created successfully' })
@ApiResponse({ status: 400, description: 'Invalid geometry' })
@Post()
async createField(@Body() createFieldDto: CreateFieldDto) {
  // Implementation
}
```

---

## Questions?

- **General questions**: Open a [GitHub Discussion](https://github.com/yourusername/soilviews/discussions)
- **Bug reports**: Open a [GitHub Issue](https://github.com/yourusername/soilviews/issues)
- **Security concerns**: Email security@soilviews.bg

---

**Thank you for contributing to SoilViews! 🌾**
