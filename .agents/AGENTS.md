# EventDecor Agent Guidelines

## 1. Actionable Detailed Reporting

Whenever you are auditing the codebase, do **not** provide aggregate totals for issues (e.g. "336 missing `.lean()`"). Instead, for **every issue reported**, you MUST provide the following details:

- Exact file path
- Exact function/class name
- Exact line number
- Why it is a problem
- Recommended fix
- Implementation priority

Example format:

```text
backend/src/controllers/productController.ts
Line 184
Query: Product.find(...)
Reason: Read-only endpoint
Safe to use .lean(): YES
```

## 2. Architecture Health Dashboard

Every major refactoring or restructuring phase MUST end with an Architecture Health Dashboard to track measurable progress. Present this exact block at the end of the phase:

```text
Architecture Health

Build
[PASS/FAIL]

TypeScript
[PASS/FAIL]

ESLint
[PASS/FAIL]

Circular Dependencies
[Count]

Test Suites
[Passed] / [Total]

Snapshots
[Count]

Bundle Size
[Status]

API Contracts
[Status]

Database Queries
[Before] → [After]

N+1 Queries
[Before] → [After]

SRP Violations
[Before] → [After]

Controllers >600 LOC
[Count]

Services >600 LOC
[Count]

Performance
[Status]

Security
[Status]
```

## 3. Service Extraction Rules

When extracting logic from God files or controllers:

1. **Prefer Existing Services:** Before extracting logic, determine whether an appropriate service already exists (e.g., use `RecommendationEngine` instead of creating `RecommendationCacheService`).
2. **No Single-Method Services:** Do not create a service containing only one method (e.g., `DeleteProductImageService`). Create services only when they represent a reusable business capability.
3. **Orchestration Layer:** Reduce controllers to an orchestration layer (Request -> Validation -> Service -> Service -> ApiResponse). Do NOT decompose controllers into multiple files unless they clearly represent multiple bounded contexts.
4. **Pragmatic Sizing:** Target controllers of roughly 200–400 LOC after extraction, but do not force an arbitrary size limit. Leave highly cohesive, algorithm-heavy files alone.
