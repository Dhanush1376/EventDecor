# Deployment & Proxy Configuration

## Trust proxy (`TRUST_PROXY_HOPS`)

Express uses `trust proxy` to read the client IP from `X-Forwarded-For` for rate limiting and audit logs. If the hop count is wrong, attackers can spoof IPs and bypass rate limits.

| Target | Recommended `TRUST_PROXY_HOPS` |
|--------|----------------------------------|
| Render (single proxy) | `1` |
| Vercel serverless / edge | `1` |
| Cloudflare → Render | `2` |
| Local dev (no proxy) | `0` or `1` |

Set in environment:

```env
TRUST_PROXY_HOPS=1
```

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
