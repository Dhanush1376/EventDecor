# Performance & scaling

## Resolved bottlenecks

| Item | Status |
|------|--------|
| Gallery 50 MB multer buffer | **Fixed** — `multerGallery` streams to Cloudinary (`createCloudinaryStreamStorage` in `backend/src/middleware/upload.ts`). |
| Socket.io unauthenticated connections | **Fixed** — JWT on `io.use()` + `/admin` and `/user` namespaces; default namespace rejected. |
| Render Starter OOM | **Fixed** — `render.yaml` uses `plan: standard` (2 GB). |
| `TRUST_PROXY_HOPS` in blueprint | **Fixed** — explicit `value: "1"` (use `2` with Cloudflare). |
| Redis in CI | **Fixed** — Redis 7 service in `.github/workflows/ci.yml`. |
| Wallet history index | **Present** — `{ userId: 1, createdAt: -1 }` on `WalletTransaction`. |
| Admin analytics cache | **Default 300s** — `ADMIN_ANALYTICS_CACHE_TTL`; staging uses 120s. |

## Checkout code splitting

`Checkout.jsx` uses `CheckoutProvider` + lazy step chunks (`CheckoutAddressStep`, `CheckoutOrderSummaryStep`, `CheckoutPaymentStep`, `CheckoutSidebar`). Each step loads only when the wizard reaches that step (sidebar loads on mount).

Verify chunk sizes after build:

```bash
cd frontend && npm run build:report
```

Target: each step chunk under ~30 KB gzip where possible.

## Horizontal scaling

- **Socket.io:** requires `REDIS_URL` + Redis adapter (`REQUIRE_REDIS=true` in production).
- **MongoDB:** set `MONGO_POOL_SIZE=10` per instance; watch Atlas connection count (`pool × instances`).
- **Render deploys:** rolling deploys on Standard plan replace instances with health checks (`healthCheckPath: /api/health`) — not blue/green, but near zero-downtime when health passes.

## Staging

`siri-arts-backend-staging` in `render.yaml` — point to a separate Atlas cluster/DB and Redis instance in Render config groups.

## Schema migrations

See `backend/migrations/README.md` for the migrate-mongo workflow (manual ops today).
