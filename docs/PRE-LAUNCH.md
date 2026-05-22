# Pre-launch checklist (Section 9)

Use this with [SECURITY-STATUS.md](./SECURITY-STATUS.md) and [ENTERPRISE-ROADMAP.md](./ENTERPRISE-ROADMAP.md).

## Mandatory (launch blockers)

| # | Item | Status |
|---|------|--------|
| 1 | Remove hardcoded `onrender.com` API fallbacks | ✅ Done |
| 2 | CSRF protection (double-submit cookie) | ✅ Done |
| 3 | `REQUIRE_REDIS=true` + Redis provisioned on Render | ✅ Config in `render.yaml` — verify in dashboard |
| 4 | Distributed cron locks | ✅ Done |
| 5 | Marble texture on Cloudinary; `VITE_MARBLE_TEXTURE_URL` required | ✅ Done |
| 6 | Hard-exit if no email provider in production | ✅ Done (`envValidation.ts`) |
| 7 | `robots.txt` disallows `/admin` and `/api` | ✅ Done |
| 8 | `npm run create-indexes` on production Atlas | ⏳ **Ops** — run once per cluster |
| 9 | TTL indexes on ephemeral collections | ✅ Schema + test; run `create-indexes` in prod |

## Strongly recommended (within 2 weeks)

| # | Item | Status |
|---|------|--------|
| 1 | Tighten Vercel CSP (`style-src` without full `unsafe-inline`) | ✅ Done — monitor Framer/Recharts |
| 2 | Safety lock in Redis | ✅ Done |
| 3 | Encrypt `twoFactorSecret` | ✅ Done |
| 4 | LogRocket / Sentry redaction | ✅ Done |
| 5 | Upgrade Render to Standard+ plan | ⏳ **Ops** |
| 6 | `npm run build:report` chunk audit | ⏳ **Ops** — run before launch |
| 7 | GDPR export + erasure API | ✅ Done — `GET /api/users/me/export`, `DELETE /api/users/me` |
| 8 | Load test (~500 concurrent users) | ⏳ **Ops** — run `k6 run scripts/loadtest/k6-smoke.js` (scale VUs to 500) |
| 9 | API `/api/v1/` versioning | ✅ Done — `registerApiRoutes` |
| 10 | 2FA API + login flow | ✅ Done — backend + `Auth.jsx` 2fa step |
| 11 | Payment reconciliation cron | ✅ Done — daily 04:00 UTC |
| 12 | CDN health in `/api/health` | ✅ Done |

## Nice to have (roadmap)

See [ENTERPRISE-ROADMAP.md](./ENTERPRISE-ROADMAP.md).
