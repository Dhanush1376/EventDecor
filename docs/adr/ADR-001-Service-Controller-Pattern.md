# ADR 001: Service-Controller Pattern and Frontend API Encapsulation

## Status

**Accepted**

## Date

June 23, 2026

## Context

The application originally suffered from bloated frontend components and deeply coupled backend controllers.

1. **Frontend**: React components were directly fetching data from REST APIs using `fetch` or `axios`, causing mixed concerns (UI rendering and data fetching) and large "God components".
2. **Backend**: Express controllers handled both HTTP transport logic (req/res, status codes) and complex business logic, making them hard to test and maintain.

As the codebase scales to an enterprise level, we needed a robust pattern to decouple the data access layer from the UI presentation, and separate business logic from HTTP handling.

## Decision

We adopted the **Service-Controller Pattern** across the full stack:

### 1. Frontend: Domain Services Layer

- Created a dedicated `frontend/src/services/api/` directory.
- Encapsulated all API requests into dedicated service files per domain (e.g., `blogService.js`, `locationService.js`, `orderService.js`).
- UI components now only call these services, remaining agnostic to the underlying HTTP client, base URLs, or authentication headers.
- **Benefits**: Centralized error handling, easy to swap out the HTTP client (e.g., to a different `axios` instance or native `fetch`), and vastly improved component readability.

### 2. Backend: Service Abstraction

- Adopted the practice of keeping Express controllers (`frontend/src/controllers/*`) "thin".
- Controllers are responsible strictly for extracting request data, validating it, calling a domain service or Mongoose model, and formatting the HTTP response.
- Complex business logic, transactions, and integrations are pushed down to the Mongoose Model layer or dedicated background services.

## Consequences

### Positive

- **Testability**: Services can be unit tested without needing an Express HTTP mock. Frontend components can mock `domainServices.js` without setting up MSW or fetch mocks.
- **Maintainability**: Clear separation of concerns. If an endpoint changes, only the service file needs updating, not the 15 UI components that use it.
- **Reusability**: API calls can be shared between different components seamlessly.

### Negative

- **Indirection**: Adds an extra layer of files and abstraction, which may slightly increase the learning curve for new developers.
- **Boilerplate**: Requires writing wrapper functions for simple CRUD operations.

## Alternatives Considered

- **Direct Fetching with React Query inside Components**: We rejected this because it still tied the URL structures directly to the UI, making sweeping API changes difficult. We instead chose to use React Query _in combination_ with the Service layer (Query calls the Service).
