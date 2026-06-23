# ADR 002: UI Component Decomposition and Modularity

## Status

**Accepted**

## Date

June 23, 2026

## Context

The React frontend had grown organically over time, resulting in massive "God components" (e.g., files over 500-1000 lines of code) that handled layout, state, API fetching, styling, and rendering of deeply nested sub-sections.
This architectural anti-pattern made the codebase highly fragile:

- Merge conflicts were frequent on large files.
- Reusing parts of the UI (e.g., a specific visual search setting or address form) was impossible.
- Performance profiling and targeted React memoization were difficult due to the large rendering trees inside single components.

## Decision

We adopted a strict **Component Decomposition Policy**:

1. **Maximum File Size Guideline**: Components should ideally remain under 200 lines. If a file grows beyond 300 lines, it must be audited for decomposition.
2. **Sub-Component Extraction**: Large monolithic layouts are broken down into logical semantic blocks (e.g., `AboutHero`, `AboutStory`, `AboutGallery`).
3. **Colocation**: Sub-components that are only used by a specific page/feature are colocated in a sub-folder representing that feature, rather than polluting the global `src/components/` directory.
4. **Single Responsibility**:
   - Smart/Container Components: Handle state, hooks, and data fetching, then pass props down.
   - Dumb/Presentational Components: Receive props and render UI, free of side effects.

## Consequences

### Positive

- **Readability**: Developers can instantly understand the high-level structure of a page by looking at the composition of semantic tags in the root component.
- **Maintainability**: Bugs are isolated to specific small files.
- **Performance**: We can utilize `React.memo` effectively on expensive sub-components.
- **Reusability**: Smaller primitives (like `AuthModal` or `AddressModal`) can be composed easily anywhere in the application.

### Negative

- **Prop Drilling**: Decomposing components sometimes leads to passing props down multiple levels. We mitigate this using Context API (`ProviderComposer`) or Zustand/Redux for truly global state, and custom hooks for localized logic.
- **File Proliferation**: A single page might now consist of 5-8 files instead of 1, increasing the cognitive load when navigating the file explorer.

## Implementation Notes

During the enterprise audit (June 2026), Tier 1, Tier 2, and Tier 3 monoliths (such as `AuthModal`, `About`, `AdminOrderDetail`, `EventCollections`, `OrderTrackingPublic`) were successfully split into 40+ modular components.
