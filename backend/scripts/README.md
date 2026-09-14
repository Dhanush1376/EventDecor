# Backend Scripts Catalog

This directory contains operational, verification, diagnostic, and data migration utilities for the Siri Arts & Crafts backend.

## Directory Structure

```
scripts/
├── create_indexes.ts               # Production: Ensures optimized MongoDB index builds
├── invalidate-discovery-cache.ts   # Production Ops: Flushes Redis catalog discovery cache
├── invalidate-trending-cache.ts    # Production Ops: Flushes Redis trending products cache
├── seedCatalogRegistry.ts          # Production Ops: Seeds system categories & registry
├── validate_env.ts                 # Preflight: Validates mandatory environment variables
│
├── verification/                   # Automated & manual integration verification suites
│   ├── verify_comprehensive.ts
│   ├── verify_emails.ts
│   ├── verify_invoice_auth.ts
│   ├── verify_marketing_endpoints.ts
│   ├── verify_notification_idempotency.ts
│   ├── verify_notification_security.ts
│   ├── verify-restore.js
│   ├── test-email-idempotency.ts
│   ├── test-status-bug.ts
│   ├── test_authoritative_marketing_send.ts
│   ├── test_create_provider.js
│   ├── test_emails.js
│   └── test_groq_text.js
│
├── diagnostics/                    # Performance testing, disaster recovery drills, and hotfixes
│   ├── diag.js
│   ├── fix-thumbnails.js
│   ├── fix.js
│   ├── fixOrderPaymentStatuses.js
│   ├── restore_put_service.ts
│   ├── searchPerformance.ts
│   ├── simulate_dr_drill.ts
│   └── simulate_razorpay_e2e.ts
│
└── migrations/                     # Data transformations and historical backfills
    ├── backfill_notifications.ts
    ├── enrich_notifications.js
    ├── migrateContent.ts
    ├── migrateTransactions.ts
    ├── normalizeTags.js
    ├── seed-cms-navigation.js
    └── seed_notifications.ts
```

## Running Scripts

Use `tsx` to execute TypeScript scripts in this directory:

```bash
# Validate production environment
npm run check-env

# Ensure database indexes
npm run create-indexes

# Seed catalog registry
npm run seed:catalog

# Run a verification script
npx tsx scripts/verification/verify_notification_idempotency.ts
```
