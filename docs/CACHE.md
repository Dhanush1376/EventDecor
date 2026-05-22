# API response caching

## Production requirement

Set `REQUIRE_REDIS=true` and `REDIS_URL` in production. Without Redis:

- Public list endpoints (`/api/products`, `/api/events`, `/api/gallery`) hit MongoDB on every request
- Admin analytics cache is not shared across instances
- Cron jobs cannot use distributed locks (duplicate runs when scaled)

## Public GET cache (`redisResponseCache`)

| Route | TTL | Middleware |
|-------|-----|------------|
| `GET /api/products` | 120s | `redisResponseCache(120)` |
| `GET /api/products/:id` | 120s | `redisResponseCache(120)` |
| `GET /api/products/categories` | 300s | `redisResponseCache(300)` |
| `GET /api/events` | 120s | `redisResponseCache(120)` |
| `GET /api/events/:id` | 120s | `redisResponseCache(120)` |
| `GET /api/gallery` | 120s | `redisResponseCache(120)` |
| `GET /api/gallery/categories` | 300s | `redisResponseCache(300)` |

Cache keys include `api:public-cache-version` (bumped on writes). Response header `X-Cache: HIT|MISS`.

### Invalidation (`bumpPublicCacheVersion`)

Call chain — any mutation below bumps the version and invalidates all public Redis response keys:

| Area | Trigger |
|------|---------|
| Products | `ProductService` create / update / delete |
| Events | `eventController` create / update |
| Gallery | `galleryController` create / update / delete |
| CMS sections | `contentService.upsertSection`, `publishAll` |
| CMS (legacy) | `cmsService` section updates |

## Admin analytics cache (`adminResponseCache`)

| Route | TTL |
|-------|-----|
| `GET /api/analytics/dashboard` | `ADMIN_ANALYTICS_CACHE_TTL` (default 20s) |

Invalidated via `bumpAdminAnalyticsCacheVersion()` (also called when public cache bumps). Order mutations call `bumpAdminAnalyticsCacheVersion` from `orderService`.

## Pre-deploy indexes

Run once per environment (and after schema index changes):

```bash
cd backend && npm run create-indexes
```

Index builds also run in the background on server boot (non-blocking).
