# Independent Production Audit — Siri Arts & Crafts

Audit date: 2026-10-31 · Auditor: Claude (independent review, read-only)
Scope: repository at `D:\PROJECTS\Siri Arts & Crafts`, branch `main`, HEAD `d36c6b08`, **plus 98 uncommitted working-tree changes**. Live site and API probed with read-only GET requests only.

Companion documents: [Scorecard](PRODUCTION-READINESS-SCORECARD.md) · [Issues register](CRITICAL-ISSUES-REGISTER.md) · [User journeys](USER-JOURNEY-VALIDATION.md) · [Performance](PERFORMANCE-AND-SMOOTHNESS-AUDIT.md) · [Launch decision](LAUNCH-READINESS-DECISION.md)

---

## Executive summary

| # | Item | Value |
|---|---|---|
| 1 | Overall score | **4.7 / 10** |
| 2 | Launch recommendation | **NOT READY TO LAUNCH** |
| 3 | P0 issues | 2 |
| 4 | P1 issues | 10 |
| 5 | P2 issues | 12 |
| 6 | P3 issues | 4 |
| 7 | Subsystems inspected | 27 rated (24 scored, 3 UNVERIFIED) |
| 8 | Automated tests executed | 238 (backend 197 in 25 files, frontend 41 in 4 files) |
| 9 | Tests passed | 238 |
| 10 | Tests failed | 0 |
| 11 | Not executed | All interactive end-to-end journeys, Razorpay test-mode payment, load tests, Lighthouse/CWV, accessibility scan, frontend `type-check` |
| | Static checks | backend `tsc --noEmit` ✅, backend ESLint ✅, frontend `vite build` ✅, **frontend ESLint ❌ (7 errors)** |

**12. Major performance problems:** full-resolution Cloudinary images (590 KB / 346 KB) on the homepage; ~3 s public CMS/category APIs that gate homepage sections; a large vendor surface (Sentry + LogRocket chunk 461 KB raw). Core Web Vitals are UNVERIFIED (see the performance doc for why).

**13. Major security problems:** order-timeline IDOR exposing Razorpay payment entities (SAC-003); 3 critical + 19 high dependency advisories (SAC-009); 30-day refresh token in `localStorage` with `script-src 'unsafe-inline'` (SAC-008); public business-metrics endpoint in production (SAC-013); hard-coded QR fallback secret (SAC-017).

**14. Broken customer journeys:** order tracking (FAILED, SAC-006); About page in the working tree (FAILED, SAC-010); stock correctness at checkout in the working tree (FAILED, SAC-001); customer cancellation (not supported by design).

**15. Infrastructure weaknesses:** no verified off-site backup (S3 adapter is a stub, SAC-002); CI deploys and smoke-tests Railway while production runs on Render (SAC-020); smoke test passes on Cloudflare 403; outbox backlog of ~142 days unnoticed in production (SAC-007); 100 MB in-memory uploads on a small container.

**16. Five most important actions before launch**
1. Decide the inventory model and restore atomic stock enforcement, or implement explicit made-to-order mode (SAC-001).
2. Put real off-site backups in place and prove a restore (SAC-002).
3. Fix authorization and money-integrity defects: timeline IDOR, coupon bypass/race, wallet skip (SAC-003/004/005), each with integration tests.
4. Clear critical/high dependency advisories and make CI block on them. Move the refresh token to an HttpOnly cookie (SAC-009, SAC-008).
5. Repair order tracking and drain or alert on the outbox; record a Razorpay test-mode end-to-end run (SAC-006, SAC-007, payment certification).

**What this means for a real customer today:** they can open the site and browse. Pages arrive slowly on mobile because of heavy images and ~3 s data calls. Checkout and payment are probably correct on the happy path (good server-side verification), but that was not proven end to end in this audit. The "track your order" link they receive won't work, and they can't cancel. If the current working tree is deployed, they could also buy items that aren't in stock.

---

## Phase 1 — Discovery: subsystem inventory

- **Monorepo:** `backend/` (Express 5 + TypeScript, Mongoose 9, 731 source files), `frontend/` (React 19 + Vite 8, JS/JSX, 725 source files), root orchestration `package.json`, CI in `.github/workflows/ci.yml` and `codeql.yml`.
- **Backend domains (`backend/src`):** auth (OTP email/phone, Google, 2FA, sessions/refresh rotation), commerce (orders, coupons, refunds, custom orders, contact), products/categories/reviews, rentals, returns/exchanges, event bookings, CMS/blog/showcase/gallery, discovery (search, recommendations, visual search, AI), marketing automation, loyalty/wallet, notifications (email/SMS/socket), analytics, backup, maintenance mode, store settings. 101 models, 22 job files (BullMQ + node-cron), outbox pattern, Socket.IO with a Redis adapter.
- **Integrations:** Razorpay, Cloudinary, Brevo/SMTP (nodemailer), Google Identity, Redis/BullMQ, Sentry, Prometheus, LogRocket (frontend), Leaflet/OpenStreetMap.
- **Deployment:** frontend on Vercel behind Cloudflare (`frontend/vercel.json` rewrites `/api/*` and `/socket.io/*` to `eventdecor-fg3l.onrender.com`); backend Dockerfile with `railway.json`; PM2 ecosystem file; `docker-compose.yml`.
- **Uncommitted working-tree changes (98 files)** include removal of the gallery feature, stock-check removal (SAC-001), forced gallery-hide settings (SAC-016), About-page breakage (SAC-010), CORS dev origins, sitemap changes.
- **Architecture observations:**
  - The scope is far larger than a small craft shop needs (multi-region backup planner, visual search, AI curation, marketing automation, rule engine). Every subsystem is code that has to be secured and maintained, and several are partial (backup S3, logistics tokens).
  - Circular dependencies are handled by runtime wiring (`server.ts` "Wire up circular dependencies") and many inline `require()` calls inside services.
  - Stubs on production paths: `S3StorageProvider` (mock checksum), the admin "Database reset" (fake).
  - `README.md` links to a `docs/` tree that didn't exist and describes the system as "enterprise-grade".
  - Dead code found: `LogisticsService.generateTrackingToken` (never called), `Order.publicTrackingToken` (never written).
  - A full dead-code/unused-dependency sweep (`knip.json` exists) was **not executed**.

## Phase 2 — Frontend

- **Strengths:** 76 lazy routes; React Query; error boundaries; Helmet-based SEO component; CSRF-aware API client; postbuild bundle budgets.
- **Defects:** SAC-010 (runtime ReferenceError on `/about`), SAC-014 (fake admin reset), SAC-008 (token storage), SAC-011 (images), SAC-027 (2,000–2,700-line admin components), 28 lint warnings including missing hook dependencies (`ReturnDetailPage.jsx:40,60`).
- **UI/UX on mobile, tablet and desktop: UNVERIFIED.** No interactive device testing was done. Judging layouts from code wouldn't be honest.

## Phase 3 — Backend

- **Good:** global timeouts (`requestTimeout(60000)`), Redis-backed rate limiters per sensitive route (order creation 10/15 min, payment verify 20/15 min, OTP send/verify), body-size guard, `express-mongo-sanitize` + `queryGuard`, XSS sanitisation, idempotency middleware, transactions on order creation and status updates, lease-locked `PaymentAttempt`, outbox for side effects, structured logging, Sentry.
- **Defects:** SAC-001, SAC-003, SAC-004, SAC-005, SAC-006, SAC-015, SAC-018, SAC-019, SAC-024, SAC-025. Silent catches on business logic (e.g. rule engine and marketing calls in `OrderCheckoutService.ts`). The wallet skip is the dangerous one.
- **Concurrency:** coupon and wallet races confirmed by code; stock race removed together with the guard (working tree). HEAD had a correct atomic `$expr` guard.

## Phase 4 — Database and data integrity

- TTL-based `InventoryReservation` with a sweep index, soft-delete plugin to a recycle bin, immutable invoice snapshots, a `UsedRefreshToken` reuse table.
- Integrity risks: SAC-001 (stock), SAC-004 (coupon counters), SAC-005 (wallet), SAC-015 (any status by staff; `Delivered` grants loyalty rewards, so moving an order back and forth is guarded only by `rewardsProcessed`).
- Backups: SAC-002. **No production data was read or modified.**

## Phase 5 — User journeys

See [USER-JOURNEY-VALIDATION.md](USER-JOURNEY-VALIDATION.md). Most interactive journeys are UNVERIFIED because production mutations are forbidden and no local stack with test credentials was provisioned.

## Phase 6 — Performance

See [PERFORMANCE-AND-SMOOTHNESS-AUDIT.md](PERFORMANCE-AND-SMOOTHNESS-AUDIT.md).

## Phase 7 — Security

| Area | Verdict | Evidence |
|---|---|---|
| JWT handling | Good with caveats | HS256 pinned, secret rotation list, blacklist, password-change invalidation (`authMiddleware.ts`); shared secret across token types (SAC-024) |
| OTP | Good | `crypto.randomInt`, bcrypt hash, attempt cap, IP throttle; dev-only OTP logging gated on `NODE_ENV==='development'` |
| CSRF | Good | Double-submit cookie; Bearer fallback with Origin allowlist check (`csrfMiddleware.ts`) |
| Access control | **FAILED** in one place | SAC-003 timeline IDOR; SAC-018 custom order |
| Admin authz | Good (code) | `requireRole`/`requireAdmin` re-read role from DB/cache, safety lock, audit log on mutations |
| Webhooks | Good | Raw-body HMAC, timing-safe comparison, event dedup, dead-letter after 10 attempts |
| Uploads | Partial | MIME allowlist + magic-byte check; 100 MB memory buffers (SAC-019) |
| Secrets | Partial | `.env*` files ignored (only `.env.example` tracked); TruffleHog in CI; hard-coded QR fallback (SAC-017) |
| XSS | Weak | CSP allows `'unsafe-inline'` scripts; DOMPurify critical advisory; tokens in `localStorage` |
| Dependencies | **FAILED** | SAC-009 |
| Info exposure | **FAILED (live)** | SAC-013 business metrics public |

No destructive or intrusive security tests were run against production.

## Phase 8 — Payments and orders

- One successful payment gives one order: **VERIFIED (code + tests)** (`PaymentAttempt` lease lock, `success` short-circuit, unique `_id = pendingOrderId`).
- Duplicate webhooks don't duplicate business operations: **VERIFIED (tests)**.
- Failed or tampered payments don't create confirmed orders: **VERIFIED (code)**. Captured-but-invalid payments get an outbox refund request.
- Inventory can't go negative: **FAILED (working tree)**. Clamping hides it instead of preventing it.
- Invalid order transitions rejected: **PARTIAL**. True for customers; staff bypass everything.
- Customer-facing status reflects backend state: **PARTIAL**. "Shipped" is collapsed into "Processing", and tracking is broken.
- Refunds: queued via `PaymentRefundService.initiateAsyncRefund`. **Not exercised.** The production outbox backlog suggests side-effect processing has failed at least for some events.

## Phase 9 — Infrastructure

See SAC-002, SAC-007, SAC-013, SAC-020. Live health endpoints responded in 0.7–1.0 s. HTTPS, HSTS (preload), frame-deny and nosniff headers are set at Vercel. Render plan, autoscaling, Atlas tier and Redis provider are **UNVERIFIED**.

## Phase 10 — SEO, accessibility, trust

- **SEO:** title, description, canonical, OG and Twitter tags in `frontend/index.html`. Sensible `robots.txt`. Live sitemap returns 200 (115 KB, 152 URLs in the static copy). Product JSON-LD not validated.
- **Accessibility:** UNVERIFIED (no axe or screen-reader pass).
- **Trust:** policy routes exist. Content is DB-driven and UNVERIFIED. The no-cancellation rule must be disclosed. Broken tracking links hurt trust directly.

## Phase 11 — Test coverage matrix

| Subsystem | Unit | Integration | E2E | Verdict |
|---|---|---|---|---|
| OTP / sessions / auth | ✅ | ✅ (several suites, incl. concurrency) | ❌ | Reasonable |
| CSRF / security middleware | ✅ | ✅ (`tests/integration/security`) | ❌ | Reasonable |
| Payment verification | — | ✅ (mocked Razorpay) | ❌ | Partial; no test-mode run |
| Webhook idempotency | — | ✅ | ❌ | Good |
| Tax engine | ✅ | — | — | Good |
| Rental calculations | ✅ | — | ❌ | Partial |
| Return state machine | ✅ (backend + frontend timeline) | — | ❌ | Partial |
| COD OTP | ✅ | — | ❌ | Partial |
| **Inventory reservation / stock** | ❌ | ❌ | ❌ | **None.** The suite passed after all stock checks were removed |
| **Coupons** | ❌ | ❌ | ❌ | None |
| **Wallet at verification** | ❌ | ❌ | ❌ | None |
| **Order status transitions / authz** | ❌ | ❌ | ❌ | None |
| Order tracking | ❌ | ❌ | ❌ | None (feature is broken) |
| Frontend components / checkout UI | ❌ | ❌ | ❌ | None (4 util test files total) |
| Admin | ❌ | ❌ | ❌ | None |

Coverage percentages weren't generated. `coverage/` folders exist but may be stale, so they weren't relied on.

## Phases 12–14

See the [scorecard](PRODUCTION-READINESS-SCORECARD.md), the [issues register](CRITICAL-ISSUES-REGISTER.md) and the [decision](LAUNCH-READINESS-DECISION.md).

---

## Evidence log (commands run, all read-only)

| Command | Result |
|---|---|
| `backend: npx vitest run` | 25 files, 197 tests passed (in-memory Mongo replica set; verified that no test connects to a real DB) |
| `backend: npx tsc --noEmit` | exit 0 |
| `backend: npx eslint src` | exit 0 |
| `frontend: npx vitest run` | 4 files, 41 tests passed |
| `frontend: npx eslint .` | **7 errors, 28 warnings, exit 1** |
| `frontend: npx vite build --outDir <scratch>` | exit 0 (output kept out of the repo) |
| `npm audit --omit=dev` (both) | backend 2 critical / 16 high / 5 moderate / 1 low; frontend 1 critical / 3 high |
| `git diff HEAD` on inventory/checkout/cart/model/settings files | Confirms SAC-001 and SAC-016 are uncommitted changes |
| `curl` GETs to `/`, `/health`, `/api/readiness`, `/sitemap.xml`, `/api/business-metrics`, `/api/products` | See the performance doc and SAC-007 / SAC-013 / SAC-025 |
| Built-in browser load of `/` + Performance API | See the performance doc (hidden pane, indicative only) |

Rules followed: no application source files modified, no database access, no production mutations, no deploys, no commits, no secrets printed. The only files written are the six documents under `docs/`.
