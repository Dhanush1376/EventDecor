# API versioning

## Stable contract

**`/api/v1` is the stable, documented API contract.** Clients building new integrations should use this prefix exclusively.

The unversioned `/api` prefix currently mounts **identical route handlers** as `/api/v1`. This is intentional for backward compatibility, not semantic versioning.

## What this means today

- Any breaking change to response shapes affects **both** `/api` and `/api/v1` until handlers diverge.
- Each request is tagged with `req.apiVersion` (`'v1'` | `'legacy'`) via middleware in `registerApiRoutes`.
- Production responses from `/api` (legacy) include:
  - `Deprecation: true`
  - `Link: </api/v1>; rel="successor-version"`

## Shipping breaking changes (long term)

1. Implement new behavior only when `req.apiVersion === 'v1'` (or add `/api/v2`).
2. Keep legacy `/api` on the old shape until a published sunset date.
3. Document the migration in release notes and update the frontend base URL to `/api/v1`.

## Health and meta endpoints

These remain unversioned at the app root:

- `GET /api/health`
- `GET /api/readiness`
- `GET /api/version`
