# Architecture Decision Records (ADRs)

## Context

As part of the Enterprise Codebase Cleanup and Refactoring effort (Sprint 1-4), we implemented several architectural changes to ensure long-term scalability, maintainability, and security.

## Decisions

### 1. Separation of Concerns in Backend Monoliths

- **Problem**: Large controller/service files like `visualSearchService.ts` (1500+ lines) and `customOrderController.ts` (1200+ lines) were hard to maintain and test.
- **Decision**: We split monolithic files into domain-specific modules. For example, `visualSearchService.ts` was split into `imageUtils.ts`, `configManager.ts`, and `similarityEngine.ts`. The Custom Order logic was also segregated.
- **Consequences**: Improves code readability, eases unit testing of isolated functions, and reduces merge conflicts.

### 2. Frontend Performance & Bundle Size Optimization

- **Problem**: Decorative 3D dependencies (`three`, `@react-three/fiber`, `maath`) were significantly inflating the frontend bundle size without adding functional value, slowing down page loads.
- **Decision**: We completely removed these unused 3D dependencies and cleaned up the `package.json` to ensure they do not ship in the final production bundle.
- **Consequences**: Reduced the initial JS payload size, improving Core Web Vitals (LCP, TTI).

### 3. Pure Functions for Business Logic

- **Problem**: Essential business logic like Cart Totals and Auth state were tightly coupled with React components, making them difficult to unit test.
- **Decision**: Extracted cart logic into `cartCalculations.js` and Auth storage logic into `authStorage.js`, and added robust unit testing using `vitest`.
- **Consequences**: Increased test coverage, isolated business rules from UI, and improved reliability.

### 4. Secret Management Security

- **Problem**: Hardcoded or exposed credentials for Razorpay, MongoDB, Cloudinary, SMTP, and GROQ were detected.
- **Decision**: Rotated all secrets and implemented safe placeholder values in `.env.local` to prevent accidental commits of production credentials.
- **Consequences**: Enhances system security and aligns with enterprise DevSecOps standards.
