# Deployment & Proxy Configuration

## Trust proxy (`TRUST_PROXY_HOPS`) — required for correct client IPs

> **Security:** Express uses `trust proxy` to derive `req.ip` from `X-Forwarded-For`. This value drives HTTP rate limits, audit logs, and Socket.io per-IP connection limits. If `TRUST_PROXY_HOPS` is too **low**, you trust spoofed headers. If it is too **high**, you read the proxy’s IP instead of the visitor’s.

| Deployment | `TRUST_PROXY_HOPS` |
|------------|-------------------|
| **Render** (API behind Render load balancer) | `1` |
| **Vercel** serverless / edge | `1` |
| **Cloudflare → Render** (orange-cloud proxy in front of API) | `2` |
| **Local dev** (direct to Node, no reverse proxy) | `0` |

Set in Render / backend environment:

```env
TRUST_PROXY_HOPS=1
```

### Verify after deploy

1. On first HTTP request, the backend logs a one-time sample: `[TRUST_PROXY] First request IP verification sample` with `reqIp`, `socketRemoteAddress`, and `x-forwarded-for`.
2. Compare `reqIp` to your real public IP (e.g. visit the site from mobile data). It should match your client, not an internal `10.x` or proxy-only address.
3. If wrong, adjust `TRUST_PROXY_HOPS` and redeploy. See also startup log: `[STARTUP] TRUST_PROXY_HOPS=…`.

**Common mistakes**

- Cloudflare in front of Render but `TRUST_PROXY_HOPS=1` → rate limits apply to Cloudflare edge IPs, not visitors.
- Local `.env` copied to production with `TRUST_PROXY_HOPS=0` on Render → `req.ip` may be wrong for limits.

## Refresh token cookies (A-03)

Refresh tokens are **httpOnly** cookies scoped to `path: /api/auth` with `SameSite=None; Secure` in production.

The frontend **must** call `POST /api/auth/refresh` (see `frontend/src/services/api.js`) — the axios interceptor already does this on 401. Do not expect the refresh cookie on other `/api/*` paths.

## Socket.io namespaces (S-02)

- `/admin` — staff roles only (admin alerts)
- `/user` — any verified customer (order/booking real-time events)

Frontend admin panel connects to `{API_HOST}/admin`.

## Cloudinary (C-01)

Production startup **exits** if Cloudinary credentials are missing (`NODE_ENV=production`).

Direct browser uploads: `GET /api/upload/signed-url` (admin auth required).

Decorative mandala assets and gallery media are served from Cloudinary (`frontend/src/assets/cloud_image_mappings.json`). Run `npm run upload-assets` in `backend` (or the `uploadAssetsToCloud` seed) after adding new local images, then remove files under `frontend/public/` and `frontend/images/` so they are not deployed to Vercel.

## Render secrets (do not auto-generate)

In [backend/render.yaml](../backend/render.yaml), `JWT_SECRET`, `ADMIN_PASSWORD`, `RAZORPAY_WEBHOOK_SECRET`, `ADMIN_EMAIL`, and `SUPER_ADMIN_EMAIL` use **`fromConfig: true`** — set them manually in a Render **Environment Group** and attach it to the service.

| Variable | Why manual |
|----------|------------|
| `JWT_SECRET` | Auto-generated values rotate if the service is recreated, invalidating all sessions |
| `ADMIN_PASSWORD` | Same — silent password change breaks admin login |
| `RAZORPAY_WEBHOOK_SECRET` | Required for HMAC verification on `/api/orders/webhook`; missing secret allows forged payment events |
| `SUPER_ADMIN_EMAIL` | Protected account; role/removal cannot be changed via admin API |

Never use `generateValue: true` for these keys.

## Performance indexes (PERF-02)

Compound indexes are defined on Mongoose schemas and applied at startup via `ensureIndexes()`. High-traffic patterns covered include:

- Orders: `{ paymentStatus, orderStatus, createdAt }` (stale-order cron), `{ user, paymentStatus, createdAt }`
- Products: `{ isActive, category, price }` (listing)
- Event bookings: `{ user, date }`, `{ user, createdAt }`
- OTP: `{ email, expiresAt }`

## Admin analytics cache (PERF-03)

`GET /api/analytics/dashboard` is cached in Redis for 20s (override with `ADMIN_ANALYTICS_CACHE_TTL`). Cache invalidates when `bumpPublicCacheVersion()` runs (product/CMS/gallery mutations).

## Sitemap CDN caching (PERF-05)

`GET /sitemap.xml` returns `Cache-Control: public, max-age=3600`. Enable Cloudflare cache for `/sitemap.xml` on the API hostname.

## MongoDB indexes (HIGH-06)

Compound indexes are built automatically on every backend startup via `ensureIndexes()` (idempotent). To skip (e.g. local dev): `SKIP_INDEX_BUILD=true`. Manual run: `npm run create-indexes` in `backend/`.

## Socket.io / Redis (HIGH-04)

- Set `REDIS_URL` before scaling to **2+ Render instances** (or set `REQUIRE_REDIS=true` to fail fast without Redis).
- Single-instance production without Redis: allowed, but `/api/health` reports `realtime.degraded: true` and the admin portal shows a warning banner.
