# User Journey Validation — Siri Arts & Crafts

Audit date: 2026-10-31

## How journeys were validated, and the limits

- **Production:** read-only GET requests and one homepage load in the built-in browser. **No logins, carts, orders or payments were made against production**, because the audit rules forbid production mutations.
- **Local:** no local stack was started. That would need MongoDB, Redis, Razorpay **test** keys and email/SMS providers, and the audit didn't provision credentials. So none of the interactive journeys were run end to end here. The automated integration suites (in-memory Mongo replica set) were run and are listed as supporting evidence.
- Outcomes: **VERIFIED** (observed working) · **FAILED** (observed or proven broken) · **PARTIAL** · **UNVERIFIED** (not executed; the code-reading verdict is given where available).

## Customer journey

| # | Step | Outcome | Evidence |
|---|---|---|---|
| 1 | Open website | VERIFIED | Live `GET /` 200, TTFB ≈1.6–1.7 s; title "Siri Arts & Crafts \| Wedding Decor, Handmade Gifts & Event Essentials" |
| 2 | Browse homepage | VERIFIED (partial) | 16 product links rendered; `/api/v1/categories/active` ≈3.0 s, `/api/v1/cms` ≈2.9 s, 590 KB product image (SAC-011). Hidden pane, so timings are indicative |
| 3 | Navigate categories | UNVERIFIED | — |
| 4 | Search | UNVERIFIED | — |
| 5 | Product details | UNVERIFIED | — |
| 6 | Select variants | PARTIAL (code) | Variant chosen but not priced; `variants[].price` ignored at checkout (SAC-026) |
| 7 | Add to cart | UNVERIFIED | Cart CSRF/auth behaviour covered by integration tests (passed) |
| 8 | Update quantities | UNVERIFIED | Server enforces `maxQuantityPerItem` (`OrderCheckoutService.ts:51-59`) |
| 9 | Remove products | UNVERIFIED | — |
| 10–11 | Refresh / cart persistence | UNVERIFIED | Cart stored server-side on `User.cart`. Out-of-stock pruning removed in the working tree (SAC-001) |
| 12 | Proceed to checkout | UNVERIFIED | — |
| 13 | Customer info | UNVERIFIED | Server requires `shippingAddress.state` |
| 14 | Payment (test mode) | **UNVERIFIED** | Not executed. Server-side verification design reviewed and sound apart from SAC-005 / SAC-021. `tests/integration/paymentVerification.test.ts` and `webhookIdempotency.test.ts` pass (mocked gateway) |
| 15 | Order creation | PARTIAL | Integration tests pass. **FAILED for stock correctness** in the working tree: orders accepted beyond stock (SAC-001) |
| 16 | Order confirmation | PARTIAL | `OrderSuccess.jsx` renders the tracking link from `publicTrackingToken`, which is never generated |
| 17 | Order history | UNVERIFIED | `/orders/my-orders` scoped to `req.user.id` (code) |
| 18 | Order status / tracking | **FAILED** (code-proven) | Public tracking token never generated; tracking links in emails have `?token=` empty (SAC-006). Customers never see "Shipped" (SAC-015) |
| 19 | Cancellation / return | PARTIAL | Customer cancellation **not supported by design** (`OrderFulfillmentService.ts:76-81`). Return flow has owner checks (code), not executed |

## Authentication

| Flow | Outcome | Evidence |
|---|---|---|
| OTP request/verify (email & phone) | VERIFIED in tests | `tests/integration/auth/auth-flows.test.ts`, `auth-unified-otp.test.ts` pass, including the concurrent duplicate-account race |
| Google sign-in | UNVERIFIED | — |
| Logout / logout-all | VERIFIED in tests (`sessionAuth.test.ts`) | — |
| Session restoration | PARTIAL | Works via a refresh token in `localStorage`, which is a security weakness (SAC-008) |
| Expired session | VERIFIED (code) | `TokenExpiredError` gives 401; password change invalidates older tokens |
| Invalid credentials / OTP brute force | VERIFIED (code + tests) | bcrypt OTP, max attempts, 5 failures per 15 min per IP |
| Unauthorized access | PARTIAL | Most routes are correct. **FAILED** for `GET /orders/:id/timeline` (SAC-003) |
| Account recovery | N/A | Passwordless OTP; recovery is OTP itself |

## Admin journey

All admin journeys are **UNVERIFIED** at runtime (no admin credentials, no production writes). Code-level observations:

- Order status updates: staff can make any transition (SAC-015).
- Image upload: magic-byte validation present; 100 MB in-memory gallery limit (SAC-019).
- Settings → "Database reset": **FAILED**. It's a fake operation that reports success (SAC-014).
- Gallery management: removed or disabled in the working tree (SAC-016).

## Failure scenarios

| Scenario | Outcome | Evidence |
|---|---|---|
| Duplicate order submission | VERIFIED (code + tests) | `idempotencyGuard`, `OrderIdempotencyManager` lock, unique `idempotencyKey` |
| Duplicate webhooks | VERIFIED in tests | `webhookIdempotency.test.ts` |
| Tampered payment signature / amount | VERIFIED (code + tests) | HMAC with timing-safe comparison, amount compared with the Razorpay API |
| Concurrent stock purchase | **FAILED** (working tree) | No guard (SAC-001) |
| Concurrent coupon / wallet use | **FAILED** (code) | SAC-004, SAC-005 |
| DB outage during auth | VERIFIED (code) | 10 s timeout gives 503 |
| Network interruption / API timeout / browser refresh mid-payment | UNVERIFIED | The reconciliation job exists (`jobs/PaymentReconciliationJob.ts`) but wasn't exercised |
| Async side-effect delivery | **FAILED (live)** | Outbox backlog, oldest event ~142 days (SAC-007) |
