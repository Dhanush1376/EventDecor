# Enterprise feature matrix (Section 7)

Last updated: 2026-05-22.

| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| Two-Factor Authentication (2FA) | High | **Implemented** | TOTP setup/enable/disable + login step after OTP (`/api/auth/2fa/*`, `Auth.jsx` 2fa step) |
| API Versioning | Medium | **Implemented** | All routers mounted at `/api` and `/api/v1` via `registerApiRoutes.ts` |
| GDPR export / erasure | Medium | **Implemented** | `GET /api/users/me/export`, `DELETE /api/users/me` (confirm email) |
| Distributed cron locking | High | **Implemented** | Redis `SETNX` in `cronLock.ts` |
| CDN health monitoring | Medium | **Implemented** | `/api/health` `cdn` field + 30-min cron probe |
| Payment reconciliation | High | **Implemented** | Daily cron + `GET /api/analytics/payments/reconciliation` |
| Feature flags | Low | **Implemented** | Env-based `FEATURE_*` / `FEATURE_FLAGS` (`featureFlags.ts`) |
| Load testing | High | **Script ready** | `scripts/loadtest/k6-smoke.js` — run before launch |
| WCAG 2.1 AA audit | Medium | **Partial** | `frontend/src/components/ui/__tests__/a11y.smoke.test.jsx` (axe-core) |
| Per-page SEO metadata | Medium | **Ongoing** | `react-helmet-async` + `docs/SEO.md` — verify product/event pages in QA |

## API quick reference

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/csrf-token` | Public | CSRF cookie + token |
| `GET /api/health` | Public | DB, Redis, CDN status |
| `GET /api/users/me/export` | User | GDPR data export |
| `DELETE /api/users/me` | User | GDPR erasure (`confirmEmail` body) |
| `GET /api/auth/2fa/status` | User | 2FA enabled flag |
| `POST /api/auth/2fa/setup` | User | Begin TOTP setup |
| `POST /api/auth/2fa/enable` | User | Confirm with token |
| `POST /api/auth/2fa/disable` | User | Disable with token |
| `POST /api/auth/2fa/verify-login` | Public | Complete login after OTP |
| `GET /api/analytics/payments/reconciliation` | Admin | Payment mismatch report |

Versioned aliases: prefix `/api/v1` for the same paths (excluding `/api/health`, webhook, sitemap).

## Ops reminders

- Run `npm run create-indexes` once on production Atlas.
- Execute load test: `k6 run scripts/loadtest/k6-smoke.js` (set `API_URL`, `TEST_EMAIL`).
- Set `FIELD_ENCRYPTION_KEY` (32-byte hex) in production for 2FA secret encryption.
