# Critical Issues Register — Siri Arts & Crafts

Audit date: 2026-10-31 · Scope: working tree on `main` (HEAD `d36c6b08` + 98 uncommitted changes) and read-only probes of the live site `siriartsandcrafts.com` / `eventdecor-fg3l.onrender.com`.

## Remediation status (2026-11-01, uncommitted)

| ID | Status | What changed | Remaining |
|---|---|---|---|
| SAC-001 | FIXED | Per-product `inventoryMode: 'tracked' \| 'made_to_order'` (default tracked, stock default back to 0). Tracked products get the atomic `$expr` stock guard plus checkout, validation and cart checks; made-to-order products skip the guard, never deduct or restore `stock`, and fire no negative-stock alerts. Reservations record `tracksStock`. The admin product form has a Made-to-Order toggle and a stock field; storefront out-of-stock/low-stock UI is restored for tracked products. | Set `inventoryMode` on existing products that should be made to order (they default to tracked) |
| SAC-002 | FIXED (code) | S3 adapter now throws instead of faking success. The orchestrator re-verifies every uploaded file's SHA-256, fails the backup if no provider has a verified copy, and labels local-only backups "NOT an off-site backup". | Turn on Atlas continuous backups/snapshots and run a restore drill |
| SAC-003 | FIXED | Owner-or-staff check on `GET /orders/:id/timeline`; `gatewayResponse` removed for non-staff. | — |
| SAC-004 | FIXED | Atomic `claimCouponUsage` (limit + one-per-customer in one conditional update) on the COD path. `createOrder` rejects coupons the customer already used. Online path claims atomically at verification; a lost race is recorded on the order and sent to Sentry, because the discounted payment is already captured. | — |
| SAC-005 | FIXED | Only one Siri-Cash checkout can be pending per customer (409 otherwise). A wallet debit that fails at verification is recorded on the order and sent to Sentry, not silently skipped. | Staff must reconcile any flagged shortfall |
| SAC-006 | FIXED | Every order gets a `publicTrackingToken`; older orders are backfilled when the owner opens them. Public tracking checks the token against the order in the URL, or a logistics JWT that now carries `purpose: 'logistics'`. **Also closed:** a tracking-link holder could have marked a delivered order `Returned` and triggered an automatic refund; public-status updates now need staff or a logistics token. | — |
| SAC-007 | PARTIAL | Hourly metrics now email/admin-notify when the oldest outbox event is over 60 min old. | The 5 stuck production events still need to be inspected and replayed (not touched: production data) |
| SAC-008 | PARTIAL | Refresh tokens are no longer returned in JSON or stored in `localStorage` (HttpOnly cookie only; legacy stored values are deleted on load). Inline boot scripts moved to `public/boot-*.js`. | `'unsafe-inline'` kept in `script-src`: Cloudflare injects a per-request inline script on HTML pages. Enable Cloudflare CSP nonce support or turn off JS detections, then remove it |
| SAC-009 | FIXED | `npm audit fix` + nodemailer 10.3.1. Prod deps: backend 0 critical / 0 high (3 moderate via swagger-jsdoc), frontend 0. CI audit now blocks on critical production advisories. | — |
| SAC-010 | FIXED | About page imports restored; frontend lint has 0 errors. | — |
| SAC-011 | PARTIAL | `quality="original"` images are now resized with `q_auto:best,f_auto` (src and srcset) instead of serving the raw upload. | Edge-cache the ~3 s public CMS/category APIs |
| SAC-012 | PARTIAL | `tests/integration/auditFixes.test.ts` (13 tests) covers stock races, made-to-order, coupon races, wallet guard, timeline authz, tracking tokens, public-status lockdown and the S3 stub. Plus 3 frontend image-URL tests. | E2E checkout in Razorpay test mode |

**Legend:** `CONFIRMED` = verified by code reading, test run or live observation. `SUSPECTED` = plausible risk, not reproduced. `WT` = only in the uncommitted working tree (not in HEAD).

| Severity | Count |
|---|---|
| P0 — launch blocker | 2 |
| P1 — major | 10 |
| P2 — moderate | 12 |
| P3 — minor | 4 |
| **Total** | **28** |

---

## P0 — Launch blockers

### SAC-001 · Stock enforcement removed: orders accepted for any quantity (WT, CONFIRMED)
- **Subsystem:** Inventory / checkout
- **Location:** `backend/src/services/InventoryService.ts:63-70` (the `$expr` stock guard was deleted from `reserveInventory`); `backend/src/services/orders/OrderCheckoutService.ts:~120` and `backend/src/services/orderValidation.ts:~106` (availability checks deleted); `backend/src/services/users/UserCartService.ts:~164` (out-of-stock cart pruning deleted); `backend/src/models/Product.ts:162,165` (default `stock` changed 0 → 999999).
- **Problem:** `git diff HEAD` shows every stock check on the purchase path was removed. `reserveInventory` now only filters `{_id, isActive}` and always increments `reservedStock`. `confirmReservation` (`InventoryService.ts:116-156`) still subtracts stock, then detects the negative value, fires a Sentry "CRITICAL: Negative stock" message and clamps stock to 0.
- **Reproduction:** Product with `stock: 2`. POST `/api/v1/orders` with `quantity: 10` (COD, verified OTP). The order is created and `Confirmed`. Stock goes to −8, gets clamped to 0, and a critical alert fires.
- **Impact:** Overselling, orders you can't fulfil, a critical alert on every such order, and stock numbers that drift. If made-to-order selling is what you want, it's only half done: alerts, low-stock emails, admin stock UI and the `stock` field all still assume finite stock.
- **Fix:** Decide the business model. If stock is finite, restore the HEAD guards. If it's made-to-order, add an explicit per-product `inventoryMode: 'tracked' | 'made_to_order'` and branch on it in `reserveInventory`, `confirmReservation`, alerts and the UI.
- **Verify:** Integration test: two concurrent orders for the last unit, where exactly one succeeds. Test that `quantity > available` is rejected with 400.

### SAC-002 · No verified off-site backup; S3 backup adapter is a stub that reports success (CONFIRMED)
- **Subsystem:** Backup & recovery
- **Location:** `backend/src/services/backup/StorageManager.ts:176-200`
- **Problem:** `S3StorageProvider.upload()` only logs and returns `checksum: 'mock-s3-hash-placeholder'`. `verify()` always returns `true`. `download()` and `delete()` are no-ops. The local provider writes to `process.cwd()/backups`, which is ephemeral on Render/Railway containers.
- **Impact:** The backup system can report healthy, verified backups that don't exist. Nothing in the repo shows a working restore. MongoDB Atlas tier and snapshot settings are **UNVERIFIED** (free/shared tiers have no point-in-time restore).
- **Fix:** Implement S3 (or another provider) with the AWS SDK, real checksums and HeadObject verify. Or remove the adapter and rely on Atlas continuous backups on a paid tier. Then run and document a timed restore drill.
- **Verify:** Restore into a scratch cluster from the latest backup and compare document counts for `orders`, `users`, `products` and `paymentattempts`.

---

## P1 — Major

### SAC-003 · IDOR: any logged-in user can read any order's payment/inventory timeline (CONFIRMED)
- **Location:** `backend/src/routes/commerce/orderRoutes.ts` (`GET /:id/timeline` has only `requireAuth`); `backend/src/controllers/commerce/orderController.ts:256-260`; `backend/src/services/orders/OrderTimelineService.ts:11-33`
- **Problem:** No ownership check. The response includes `PaymentEvent.gatewayResponse`, which is the full Razorpay payment entity (customer email, phone, method, card/VPA metadata).
- **Repro:** As user B, `GET /api/v1/orders/<A's orderId>/timeline` returns A's events.
- **Fix:** Apply the same owner-or-staff check as `getOrderById` (`orderController.ts:54-59`), and strip `gatewayResponse` for non-staff.
- **Verify:** Integration test where a cross-user request returns 403.

### SAC-004 · Coupon limits bypassable (CONFIRMED by code)
- **Location:** `backend/src/services/orders/OrderCheckoutService.ts:166-237, 405-415`; `backend/src/services/PaymentVerificationService.ts:~325`; per-user check exists only in `backend/src/controllers/commerce/couponController.ts:137-142`
- **Problem:** (a) `createOrder` never checks `usedBy` for the current user, so posting `couponCode` straight to `/orders` skips the "one per customer" rule. (b) `usageLimit` is checked when the order is created, but the counter is incremented later without a condition (`$inc` with no `usedCount < usageLimit` filter), so concurrent checkouts go over the limit. (c) Online payments increment at verification with no limit check at all.
- **Fix:** Use an atomic conditional update `findOneAndUpdate({code, $expr: {$lt: ['$usedCount','$usageLimit']}, 'usedBy.userId': {$ne: userId}}, …)` inside the transaction for both COD and online paths.

### SAC-005 · Wallet ("Siri Cash") deduction silently skipped at payment verification (CONFIRMED by code)
- **Location:** `backend/src/services/PaymentVerificationService.ts:~335-352`
- **Problem:** The Razorpay amount was computed net of `walletDeduction`. At verification, if `walletBalance < walletDeduction` (spent in a parallel checkout), the debit is skipped with no error, and the return value of `debitWalletBalance` is ignored. The customer gets the wallet discount twice.
- **Fix:** Hold or debit the wallet at checkout, or reject or refund the difference when the conditional debit returns `null`. Record a reconciliation event.

### SAC-006 · Public order tracking is non-functional (CONFIRMED)
- **Location:** `backend/src/models/Order.ts:134` (`publicTrackingToken` is never assigned anywhere in `backend/src`); `backend/src/services/logisticsService.ts:9-13` (`generateTrackingToken` is never called); `backend/src/middleware/authMiddleware.ts:340` (requires `purpose === 'logistics'`, which the generator never sets); `backend/src/services/notifications/enrichers/DeliveryEnricher.ts:16` (emails `?token=` empty); `frontend/src/pages/OrderSuccess.jsx:194`.
- **Impact:** The "Track order" links in confirmation pages and emails lead to a 401/403. The logistics status-update path can't be used.
- **Fix:** Generate the token at order creation (or issue the logistics JWT with `purpose`), and add an end-to-end test from confirmation link to tracking page.

### SAC-007 · Production outbox backlog: events stuck ~142 days (CONFIRMED live)
- **Evidence:** `GET https://siriartsandcrafts.com/api/business-metrics` (2026-10-31 16:33 UTC) returned `"pendingOutbox":5,"oldestOutboxAgeMinutes":205564`. The metric counts `PENDING` + `FAILED` (`backend/src/services/MetricsService.ts:87-97`).
- **Impact:** Notifications, refunds (`ORDER_REFUNDREQUESTED` is handled by the outbox, `backend/src/jobs/outboxProcessor.ts:498,804`) or status emails were never delivered, and nobody acted on it. Monitoring exists but isn't watched.
- **Fix:** Inspect the 5 events through the admin DLQ (read-only first), replay or resolve them, and route `oldestOutboxAgeMinutes > 60` to a paging alert.

### SAC-008 · 30-day refresh token in `localStorage` + `script-src 'unsafe-inline'` (CONFIRMED)
- **Location:** `frontend/src/utils/auth/authStorage.js:20-26`; `frontend/src/services/api.js:67-83`; CSP in `frontend/vercel.json`
- **Impact:** Any XSS becomes a persistent account takeover, including admin accounts. DOMPurify in use has a *critical* advisory (SAC-009).
- **Fix:** Keep the refresh token in an `HttpOnly; Secure; SameSite` cookie only (the CSRF double-submit already exists), and remove `'unsafe-inline'` from `script-src` using nonces or hashes.

### SAC-009 · Known-vulnerable production dependencies; CI audit non-blocking (CONFIRMED)
- **Evidence:** `npm audit --omit=dev`. Backend: **2 critical** (handlebars, proxy-addr), **16 high** (multer, socket.io-parser, engine.io, nodemailer, sharp/libheif, compression, body-parser, axios, follow-redirects, zod, ip-address, …). Frontend: **1 critical** (dompurify), **3 high** (axios, follow-redirects, socket.io-parser). `.github/workflows/ci.yml:97,128` uses `npm audit … || true`.
- **Fix:** `npm audit fix` and targeted upgrades. Fail CI on critical.

### SAC-010 · About page crashes; frontend lint fails (WT, CONFIRMED)
- **Location:** `frontend/src/pages/About/index.jsx:234,241,329,399`: `Link`, `ArrowRight`, `storeName` are undefined (imports were removed in the uncommitted edit; HEAD has them).
- **Evidence:** `npx eslint .` gives 7 errors and 28 warnings, exit 1. Because Vite doesn't type-check, `vite build` still succeeds, so this ships as a runtime `ReferenceError` (error boundary) on `/about`. CI's `npm run lint` step will fail.
- **Fix:** Restore the imports and use `storeNameUpper`/config.

### SAC-011 · Heavy, untransformed images and slow first data (CONFIRMED, timings indicative)
- **Evidence (live, hidden browser pane, so timings are throttled and indicative only):** the homepage loaded Cloudinary originals of **590 KB** and **346 KB** (`res.cloudinary.com/.../image/upload/v…/products/…` with no `f_auto,q_auto,w_` transforms). `/api/v1/categories/active` and `/api/v1/cms` took ~3.0 s and ~2.9 s. 50 JS files, ~670 KB transferred.
- **Fix:** Enforce Cloudinary transforms in `CloudinaryImage`, add responsive `srcset`, and cache categories/CMS at the edge (they're public and rarely change).

### SAC-012 · Tests miss the critical commerce logic (CONFIRMED)
- **Evidence:** All 238 tests pass even though SAC-001 removed all stock enforcement. No test file mentions `reserveInventory`, insufficient stock, coupons, wallet at verification, order timeline authorization, or public status. Frontend has 4 unit test files (utils only), no component tests and no E2E.
- **Fix:** See the test matrix in `INDEPENDENT-PRODUCTION-AUDIT.md`. Add integration tests for SAC-001/003/004/005/006 and a Playwright checkout run in Razorpay test mode.

---

## P2 — Moderate

| ID | Status | Location | Problem | Fix |
|---|---|---|---|---|
| SAC-013 | CONFIRMED live | `backend/src/routes/system/metricsRoutes.ts:8-11` | `/api/business-metrics` is public when `METRICS_API_KEY` is unset (it is unset in prod: the live request returned 200 with operational data, ~5.4 s, and runs DB aggregations, so it can also be used for DoS). | Fail closed in production. |
| SAC-014 | CONFIRMED | `frontend/src/admin/pages/AdminSettings.jsx:332-341` | "Database reset" just sleeps 2 s, shows "Database reset to defaults" and logs `HARD_RESET_EXECUTED … Success`. Fake action, false audit entry. | Remove it, or wire it to a real, guarded endpoint. |
| SAC-015 | CONFIRMED | `backend/src/services/orders/OrderStateMachine.ts:79-82` | Any staff role can make *any* transition (e.g. `Refunded→Pending`, `Cancelled→Delivered`), and `Delivered` triggers loyalty rewards. `Shipped`/`Out for Delivery` collapse into `Processing`, so customers never see "Shipped". | Staff whitelist per transition, plus a separate override with a reason. Add a `Shipped` state. |
| SAC-016 | WT, CONFIRMED | `backend/src/services/StoreSettingsService.ts:166-167` | `hideGallerySection`/`hideProductsFromGallery` hard-coded `true`, so the admin toggle does nothing. Gallery editor/uploader files deleted in the frontend. | Remove the setting from the admin UI, or restore the toggle. |
| SAC-017 | CONFIRMED | `backend/src/shared/services/barcode/QRCodeService.ts:5`, `QRVerificationService.ts:4` | Hard-coded fallback secret `default_fallback_qr_secret_change_in_production`. | Require the env var at startup. |
| SAC-018 | CONFIRMED | `OrderCheckoutService.ts:81-86` | Custom-order checkout doesn't check that `customOrderId` belongs to the caller. | Add `user: userId` to the query. |
| SAC-019 | CONFIRMED | `backend/src/middleware/upload.ts:42-46,64` | 100 MB memory-buffered gallery uploads on a small container. The concurrency limiter keys on `req.user._id`, which is always undefined (payload uses `id`), so it falls back to IP. | Stream to Cloudinary and fix the key. |
| SAC-020 | CONFIRMED | `.github/workflows/ci.yml:146-196`, `backend/railway.json`, `frontend/vercel.json` | CI deploys and health-checks **Railway**, but the live API is **Render** (`eventdecor-fg3l.onrender.com`). The smoke test treats Cloudflare 403 as success. | One deploy target. Make the smoke test fail on non-200. |
| SAC-021 | SUSPECTED | `PaymentVerificationService.ts:~155` | `authorized` (not captured) payments are accepted as paid. If auto-capture is off, orders are confirmed with no money captured. | Verify the Razorpay auto-capture setting, or capture explicitly. |
| SAC-022 | CONFIRMED | `OrderFulfillmentService.ts:76-81` | Customers can't cancel at all ("Orders cannot be cancelled once placed"). The policy page text is DB-driven and **UNVERIFIED**. | Make sure the published refund/cancellation policy matches this behaviour. |
| SAC-023 | CONFIRMED | `README.md` | Links to ~15 files under `docs/`, which didn't exist before this audit. Badge says Node 18, but `engines` requires ≥20. Says "enterprise-grade". | Fix the README. |
| SAC-024 | CONFIRMED | `SessionAuthService.ts:12`, `OtpAuthService.ts:858`, `logisticsService.ts:12` | One `JWT_SECRET` signs access, COD-verification and tracking tokens, with no `aud`/`typ` claim. `requireAuth` doesn't reject non-access tokens (only safe today because the payloads differ). | Separate secrets or an `aud` claim, checked on verify. |

## P3 — Minor

| ID | Location | Problem |
|---|---|---|
| SAC-025 | live `GET /api/products` | Unknown API routes return Express's default HTML "Cannot GET" page instead of a JSON 404. |
| SAC-026 | `Product.ts:209-216` vs `OrderCheckoutService.ts:137` | `variants[].price` exists in the schema but checkout always charges `product.price`. Harmless today (the storefront doesn't show variant prices), but misleading. |
| SAC-027 | `frontend/src/admin/pages/returns/*` | Components of 2,000–2,700 lines. 28 lint warnings (hook deps, unused imports). |
| SAC-028 | build output | `observability` chunk 461 KB raw / 127 KB br (Sentry + LogRocket), `jspdf` 389 KB, `BarChart` 350 KB. Check that none of them is on the storefront's critical path. |
