# Launch Readiness Decision — Siri Arts & Crafts

Audit date: 2026-10-31

## Decision: **NOT READY TO LAUNCH** (for the current working tree)

The site is already publicly reachable at `siriartsandcrafts.com`, so this decision covers two things:

1. **The uncommitted working tree must not be deployed.** It removes all stock enforcement (SAC-001) and ships a crashing About page (SAC-010).
2. **The currently deployed production system doesn't meet the bar for public production** either. There's no verified backup or restore (SAC-002), customer payment PII is readable across accounts (SAC-003), there are critical/high dependency advisories (SAC-009), tracking links are broken (SAC-006), and async side effects have been stuck for ~142 days unnoticed (SAC-007).

A high score in any one area doesn't change this. The P0s and unresolved P1s decide it.

## Launch blockers

| ID | Why it blocks |
|---|---|
| SAC-001 (P0) | Oversell or unfulfillable orders and corrupted stock figures, if the working tree ships |
| SAC-002 (P0) | No credible recovery plan for orders and customer data; the backup system can report fake success |
| SAC-003 (P1) | Customer data can be read by other customers |
| SAC-004 / SAC-005 (P1) | Money leakage via coupon and wallet races or bypass |
| SAC-006 (P1) | The order-tracking promise shown to every customer is broken |
| SAC-007 (P1) | Proof that failures in async processing (emails, refunds) go unnoticed |
| SAC-009 (P1) | Known critical vulnerabilities in production dependencies |

## Payment correctness: UNVERIFIED

The Razorpay integration is the best-built part of the system: server-side amount/order/currency/status verification, HMAC webhook verification on the raw body, idempotent attempt locking, webhook dedup and a reconciliation job. But **no test-mode end-to-end payment was executed in this audit**, the Razorpay auto-capture setting is unknown (SAC-021), and wallet handling at verification is wrong (SAC-005). Payment can't be certified until a Razorpay test-mode run covers success, failure, a webhook-only path (browser closed), a duplicate webhook and a refund.

## Technical vs business, legal and operational readiness

- **Technical:** not ready (above).
- **Legal / policy:** policy pages (`/policy/refund-policy`, `/policy/privacy-policy`, `/terms`, `/shipping`) are rendered from DB content that this audit couldn't inspect, so they're UNVERIFIED. The code forbids all customer-initiated cancellation. The published refund/cancellation policy must say so. GST/invoice snapshots exist but the tax configuration wasn't validated against an accountant's requirements.
- **Operational:** there's monitoring tooling (Sentry, Prometheus, hourly metrics), but nobody acts on its signals (SAC-007). Deployment targets are inconsistent (CI deploys Railway, live is Render: SAC-020). There's no on-call or runbook evidence.

## Path to "READY FOR LIMITED BETA"

1. Resolve SAC-001 (decide the inventory model) and SAC-010, then commit as a reviewed change.
2. Fix SAC-003, SAC-004, SAC-005, with integration tests.
3. Turn on real off-site backups and complete one timed restore drill (SAC-002).
4. Upgrade dependencies to clear the critical advisories, and make CI fail on critical (SAC-009).
5. Fix tracking links (SAC-006), drain the outbox backlog and alert on its age (SAC-007).
6. Run and record a Razorpay test-mode end-to-end checkout (success, failure, webhook-only, refund).

After those, re-audit. Public production also needs SAC-008, SAC-011, SAC-013, SAC-015 and SAC-020 fixed, an accessibility pass, and real-device testing.
