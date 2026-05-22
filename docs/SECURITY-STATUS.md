# Security vulnerability status (Section 8)

Last audited: 2026-05-22. Re-verify after major auth or deployment changes.

| ID | Vulnerability | Severity | Status | Resolution |
|----|---------------|----------|--------|------------|
| SEC-01 | No CSRF token | Critical | **Fixed** | Double-submit cookie + `X-CSRF-Token` on mutating `/api/*` requests (`csrfMiddleware.ts`, `api.js`) |
| SEC-02 | `unsafe-inline` in frontend CSP | Critical | **Fixed** | `style-src` tightened; `style-src-attr 'unsafe-inline'` for React dynamic styles (`vercel.json`, `docs/CSP-REMEDIATION.md`) |
| SEC-03 | Hardcoded backend URL fallback | Critical | **Fixed** | `getApiUrl()` requires `VITE_API_URL` in production (`frontend/src/utils/apiUrl.js`) |
| SEC-04 | `twoFactorSecret` plaintext | Medium | **Fixed** | AES-256-GCM at rest (`fieldEncryption.ts`, User schema getters/setters) |
| SEC-05 | Safety lock per-instance cache | Medium | **Fixed** | Redis 5s TTL + invalidation (`safetyLockCache.ts`) |
| SEC-06 | Cron jobs without locking | Critical | **Fixed** | Redis `SETNX` per job (`cronLock.ts`, `cronJobs.ts`) |
| SEC-07 | LogRocket sensitive fields | Medium | **Fixed** | `inputSanitizer`, network sanitizers, Sentry replay masking (`observability.js`) |
| SEC-08 | Admin socket connection limit | Medium | **Fixed** | Single active `/admin` socket per user (`enforceSingleAdminSession` in `socket.ts`) |
| SEC-09 | `robots.txt` missing admin disallow | Medium | **Fixed** | `Disallow: /admin`, `/api` in `frontend/public/robots.txt` |
