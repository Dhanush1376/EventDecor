# 🛡️ Enterprise Disaster Recovery & Backup Plan — Siri Arts & Crafts

This document defines the enterprise-grade disaster recovery (DR) architecture, backup strategies, and incident response workflows for the Siri Arts & Crafts production application.

---

## 1. Recovery Targets & SLAs

| Metric                             | Target       | Definition                                                                              |
| ---------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| **RTO** (Recovery Time Objective)  | < 15 minutes | Maximum acceptable time to restore service after a complete outage.                     |
| **RPO** (Recovery Point Objective) | < 5 minutes  | Maximum acceptable data loss window for transactions (using MongoDB continuous backup). |
| **MTTR** (Mean Time to Recover)    | < 10 minutes | Average time to recover from common component failures.                                 |

---

## 2. Backup Architecture & Retention Policies

Our backup strategy follows the 3-2-1 principle (3 copies, 2 media types, 1 offsite).

### 2.1 Database Backups (MongoDB)

- **Primary Mechanism:** MongoDB Atlas Continuous Cloud Backups.
- **RPO:** Point-In-Time-Recovery (PITR) allows restoration to any minute within the last 7 days.
- **Offsite Redundancy:** A custom cron script (`src/scripts/backupDb.ts`) runs nightly to `mongodump` the entire database and push the BSON dump to an AWS S3 bucket, preventing vendor lock-in with Atlas.
- **Retention Policy:**
  - Continuous (PITR): 7 Days
  - Daily Snapshots (Atlas): 30 Days
  - Weekly Snapshots (Offsite S3): 3 Months
  - Monthly Snapshots (Offsite S3): 1 Year (for compliance/auditing)

### 2.2 Media Backups (Cloudinary)

- **Primary Mechanism:** Cloudinary's highly available CDN and internal replication.
- **Offsite Redundancy:** A background synchronization script (`src/scripts/backupMedia.ts`) periodically mirrors new assets from Cloudinary to an AWS S3 cold storage bucket.
- **Retention Policy:** Media is retained indefinitely unless explicitly deleted via the admin dashboard. S3 versioning is enabled to recover accidentally deleted or overwritten assets.

### 2.3 Environment & Infrastructure Backups

- **Codebase:** GitHub (Distributed Version Control).
- **IaC (Infrastructure as Code):** `render.yaml` specifies the entire infrastructure setup (services, instances, env var schemas).
- **Secrets:** Production environment variables (`.env.production`) are stored securely in a 1Password/AWS Secrets Manager vault. Access is tightly controlled via RBAC.

---

## 3. Disaster Recovery Workflows

### 3.1 Scenario 1: Backend Service Crash (Render)

**Symptoms:** 502/503 errors, failed health checks, Sentry crash alerts.
**Recovery Strategy:**

1. Check Render Dashboard → **Events** to identify the failure (e.g., OOM, bad deploy, faulty dependency).
2. If it's a code regression, initiate **Deployment Rollback** (see Section 4.1).
3. If it's a transient crash (OOM), PM2 and Render's readiness probes will auto-restart the instance. Check `performanceMonitor.ts` logs for memory leaks.

### 3.2 Scenario 2: MongoDB Atlas Outage / Data Corruption

**Symptoms:** `MongoNetworkError` in logs, complete API failure.
**Recovery Strategy (Data Corruption via Atlas):**

1. Access MongoDB Atlas → **Backups**.
2. Select **Restore to a New Cluster** using Point-In-Time-Recovery to a timestamp immediately preceding the corruption.
3. Validate data integrity on the new cluster.
4. Update the `MONGO_URI` in Render to point to the new cluster.
5. Deploy a hotfix to patch the vulnerability/bug that caused the corruption.
   **Recovery Strategy (From S3 Offsite Backup):**
6. Provision a new MongoDB instance (Atlas or Self-Hosted).
7. Download the latest BSON dump from the offsite S3 bucket.
8. Run `mongorestore --uri="<NEW_MONGO_URI>" dump/` to restore the data.
9. Update application configurations to point to the new database.

### 3.3 Scenario 3: Redis / Socket.io Failure

**Symptoms:** Rate limits fail-open or fall back to memory, live user sessions drop, background BullMQ jobs halt.
**Recovery Strategy:**

1. The backend implements **graceful degradation**. If Upstash Redis is unreachable, rate limiting and session caching fall back to local memory and MongoDB automatically.
2. If the outage is prolonged, temporarily set `REQUIRE_REDIS=false` in Render and manually trigger a redeploy to fully detach the dependency.
3. **Queue Recovery:** Background jobs (BullMQ) will pause. Once Redis is restored, queues will automatically resume processing from their last state. Ensure dead-letter queues are monitored for any transient failures during the outage.

### 3.4 Scenario 4: Cloudinary Media Loss

**Symptoms:** Broken images on frontend, `cloudinary.api.ping()` fails.
**Recovery Strategy:**

1. Identify the scope of the loss (specific assets vs. total account compromise).
2. If restoring from S3 Offsite Backup: Run the `scripts/restoreMedia.ts` script to re-upload assets from S3 back to Cloudinary.
3. Ensure the newly generated Cloudinary URLs match the original public IDs stored in the MongoDB `Product`, `Event`, and `Gallery` documents.

### 3.5 Scenario 5: Total Region Loss / Complete Environment Failure

**Recovery Strategy:**

1. Clone the GitHub repository.
2. Import `render.yaml` into a new Render team/account or a different region (e.g., EU-West instead of US-East).
3. Restore environment secrets from the secure vault.
4. Redirect the DNS records via Cloudflare to the new Render Load Balancer.

---

## 4. Rollback Procedures

### 4.1 Application Deployment Rollback

If a newly deployed version introduces critical bugs:

1. Navigate to Render Dashboard → **Deploys**.
2. Locate the last known-good deployment.
3. Click **"Rollback to this deploy"**.
4. Render will seamlessly hot-swap the container image in ~60 seconds with zero downtime.

### 4.2 Database Schema Rollback

Code rollbacks are dangerous if the new deployment altered the database schema (e.g., renaming fields or changing data types).

1. **Forward-Compatible Migrations:** All schema changes must be designed to be backward compatible (e.g., add new fields, don't delete old ones immediately).
2. If a destructive migration was run and the code is rolled back, you **must** execute a manual reverse-migration script to restore the data to the expected format before the code rollback completes.

---

## 5. Backup Verification & Testing

Backups are useless if they cannot be restored.

### 5.1 Automated Testing

- The CI/CD pipeline runs `npm run test:integration` against a live test database to ensure the schema is sound.
- A weekly cron job automatically restores the latest S3 MongoDB dump to an isolated staging environment and runs a data integrity suite.

### 5.2 Manual Testing (Quarterly)

Every 3 months, the engineering team must conduct a "Game Day":

1. Restore a production database snapshot to a staging cluster.
2. Perform a simulated Render deployment rollback.
3. Validate that critical flows (Razorpay webhooks, product searches) operate correctly on the restored data.

---

## 6. Long-Term Maintenance Strategy

1. **Storage Lifecycle Policies:** Implement S3 lifecycle rules to transition backups older than 90 days to Glacier Deep Archive to optimize costs.
2. **Dependency Audits:** Run `npm audit` and Dependabot weekly to ensure backup scripts and core services are protected from zero-day vulnerabilities.
3. **Capacity Planning:** Review Atlas storage size and Cloudinary bandwidth quotas monthly. Auto-scaling should be enabled for Atlas disk space.

---

## 7. Emergency Response Checklist

> [!CAUTION]
> If a severe incident occurs (Security Breach, Data Loss), follow this checklist precisely.

- [ ] **Acknowledge:** Confirm the incident and notify stakeholders (Slack #incident-response).
- [ ] **Contain:**
  - If it's a security breach: Invalidate all sessions (rotate `JWT_SECRET`).
  - Block malicious IPs at the Cloudflare WAF level.
  - Revoke and rotate exposed API keys (Groq, Razorpay, Cloudinary).
- [ ] **Assess:** Identify the blast radius. Did attackers access PII? Was data dropped?
- [ ] **Recover:** Execute the relevant DR workflow (e.g., Atlas PITR restore).
- [ ] **Verify:** Run health checks (`/api/health?full=1`) and manually test core user flows.
- [ ] **Post-Mortem:** Within 48 hours, write a blameless Incident Report detailing the root cause and the action items required to prevent recurrence.
