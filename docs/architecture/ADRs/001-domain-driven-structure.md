# ADR-001: Transition to Domain-Driven Folder Structure for Controllers & Routes

**Status**: Accepted
**Date**: 2026-06-26

## Context

The backend API previously placed over 45 controller files in a flat `src/controllers/` directory and over 40 route files in a flat `src/routes/` directory. This made navigation difficult, obscured the boundary of different business domains (e.g., mixing `productController.ts` with `rentalController.ts`), and increased the likelihood of circular dependencies.

## Decision

We decided to adopt a Domain-Driven / Feature-First architectural approach for the outer layers of the application (Controllers and Routes).

We grouped all existing controllers and routes into 12 distinct bounded contexts: `auth`, `cms`, `commerce`, `customer`, `discovery`, `events`, `media`, `notifications`, `products`, `rentals`, `system`, and `users`.

The `src/services/` and `src/models/` directories remain flat for now, as breaking them apart carries a much higher risk of disrupting business logic and Mongoose schemas. This restructuring acts as an iterative step towards full feature modules.

## Consequences

- **Positive**: Massively improved navigability for new engineers. Clearer boundaries for what constitutes a feature vs. shared code. Easier to split into microservices later if necessary.
- **Negative**: Existing PRs or forks will experience merge conflicts due to moved files.
- **Neutral**: Imports across domains (e.g. `users` calling `products`) are now more explicitly visible in the path structure (`../../products/...`).
