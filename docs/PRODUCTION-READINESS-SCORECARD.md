# Production Readiness Scorecard — Siri Arts & Crafts

Audit date: 2026-10-31. Scores use the 0–10 rubric from the audit brief. A score is capped when the evidence behind it is weak: absence of evidence is not evidence of correctness. Issue IDs refer to `CRITICAL-ISSUES-REGISTER.md`.

| # | Subsystem | Score | Reason / evidence | Missing for 10 |
|---|---|---|---|---|
| 1 | Frontend architecture | 6 | 76 lazy routes, React Query, error boundaries (`components/ui/ErrorBoundary.jsx`, `AdminErrorBoundary.jsx`), build passes. But mostly JS with no type safety, 2,000+-line admin components, and a lint failure that breaks a page (SAC-010). | TS or JSDoc types on the commerce path, component decomposition, lint gate respected |
| 2 | UI/UX quality | 5 (largely UNVERIFIED) | The homepage renders live (16 product links). No interactive multi-device run was done (see the journey doc). Fake admin "DB reset" (SAC-014), broken About page (SAC-010). | Device-matrix walkthrough, empty/error-state review |
| 3 | Mobile responsiveness | UNVERIFIED (not scored) | Not tested on devices in this audit. | Real-device testing |
| 4 | Application performance | 4 | Untransformed 590 KB images, ~3 s public API calls, 670 KB transferred on the homepage (SAC-011). Timings came from a hidden (throttled) pane, so they're indicative. | Lab and field CWV data, image CDN transforms, edge caching |
| 5 | Initial loading experience | 4 | `domInteractive` ≈3.5 s, critical data APIs ≈3 s (indicative). Render-hosted API adds latency. | Edge-cached CMS/categories, preloaded LCP image |
| 6 | Navigation smoothness | UNVERIFIED (not scored) | Route chunks are split; not measured. | INP measurement |
| 7 | Backend architecture | 6 | Layered services, outbox pattern, state machines, transactions. But 731 files for a small shop, circular-dependency workarounds (`server.ts` "wire up circular dependencies", inline `require`s), unused enterprise subsystems (multi-region backup, visual search, AI). | Simpler core, enforced module boundaries |
| 8 | API reliability | 5 | Timeouts, rate limits, readiness probe, idempotency guard. But a live outbox backlog of 142 days (SAC-007), JSON/HTML 404 inconsistency, public expensive metrics route. | Watched SLOs, backlog alerting |
| 9 | Database architecture | 6 | Mongoose models with indexes and TTL reservations, replica-set transactions. Mixed-type variant fields, legacy status normalisation. | Schema cleanup, migration discipline |
| 10 | Data integrity | 3 | Stock enforcement removed (SAC-001), coupon over-use (SAC-004), wallet double-spend (SAC-005), staff can make any status transition (SAC-015). | Atomic guards and tests for each |
| 11 | Authentication | 7 | Hashed OTPs (bcrypt), attempt caps, IP throttling, refresh-token rotation with reuse table, blacklisting, password-change invalidation. Weakened by localStorage refresh tokens (SAC-008) and a shared JWT secret across token types (SAC-024). | HttpOnly refresh cookie, per-purpose keys |
| 12 | Authorization | 5 | Most customer routes check ownership correctly (returns, rentals, `getOrderById`). The timeline IDOR leaks payment PII (SAC-003). Custom-order ownership is missing (SAC-018). | Authorization test per route |
| 13 | Security | 4 | Helmet, CSRF double-submit, mongo-sanitize, webhook HMAC with raw body, timing-safe comparisons. But 3 critical / 19 high advisories (SAC-009), `unsafe-inline` CSP, IDOR, hard-coded QR secret, public metrics. | Clean audit, strict CSP, pentest |
| 14 | Payment reliability | 6 | Strong design: server-side amount/currency/order/status check against the Razorpay API, signature verification, lease-based attempt locking, webhook dedup, reconciliation job. Wallet double-spend, `authorized` accepted as paid, and **no test-mode end-to-end run was performed**, so production correctness is UNVERIFIED. | Test-mode E2E evidence, capture policy |
| 15 | Order management | 4 | Order creation works in tests. Public tracking is broken (SAC-006), customers can't cancel, staff bypass the state machine, and customers never see "Shipped". | Working tracking, strict transitions |
| 16 | Product management | 5 | Rich admin. Variant pricing is ignored, the stock model is inconsistent, gallery toggles are hard-coded. | Coherent inventory model |
| 17 | Image management | 4 | Cloudinary storage with magic-byte signature validation, but originals are served to customers and 100 MB in-memory uploads are allowed. | Transforms, streaming uploads |
| 18 | Error handling | 6 | Central `ApiError`, Sentry, fatal-error shutdown handler. Some failures are swallowed silently (wallet skip, rule-engine `catch {}`). | No silent business-logic catches |
| 19 | Caching | 6 | Redis session cache, request coalescing, cache headers. Public catalogue APIs still slow at the edge. | CDN caching for public GETs |
| 20 | SEO | 7 | Title, description, canonical, OG/Twitter tags, `robots.txt` with sensible disallows, 152-URL sitemap served live. Structured data not inspected (UNVERIFIED). | Product JSON-LD validation, per-route meta check |
| 21 | Accessibility | UNVERIFIED (not scored) | Not audited with axe or a screen reader. | Automated and manual a11y pass |
| 22 | Test coverage | 3 | 238 tests pass, but they missed the removal of all stock checks. No E2E, 4 frontend util tests, no coverage report generated. | Matrix in the main audit |
| 23 | Infrastructure | 4 | Vercel + Cloudflare frontend, Render API. CI deploys to Railway instead (SAC-020). Single small container, ephemeral disk. | One target, documented topology |
| 24 | Monitoring | 4 | Sentry, Prometheus, LogRocket, hourly metrics all exist, but a 142-day-old backlog went unnoticed. | Alerts that page a human |
| 25 | Backup & recovery | 1 | S3 adapter is a stub reporting fake success (SAC-002). No evidence of a restore. | Real off-site backups and a restore drill |
| 26 | Deployment readiness | 3 | Working tree has 98 uncommitted changes, including P0 SAC-001 and a lint failure. CI targets the wrong host. | Clean, reviewed release branch |
| 27 | Overall maintainability | 4 | Very large surface (≈1,450 source files), many "enterprise" subsystems for a small shop, inline `require`s, overstated README. | Reduce scope to what the business uses |

**Overall: 4.7 / 10** (mean of the 24 scored subsystems = 112 / 24 ≈ 4.67; the 3 UNVERIFIED rows are excluded, not scored as passes).

Even a high average would not override the P0 issues SAC-001 and SAC-002.
