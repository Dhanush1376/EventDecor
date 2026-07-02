# Enterprise Disaster Recovery & Business Continuity Plan

This document outlines the standard operating procedures (SOPs) for the EventDecor automated backup, restore, and disaster recovery system.

## System Architecture

The backup system is designed around a strictly enforced state machine (`BackupOrchestrator`) ensuring atomicity and consistency. Data is streamed in chunks from MongoDB, compressed via content-aware GZIP, encrypted via AES-256-GCM, cryptographically signed via Ed25519, and uploaded to multiple redundant cloud providers (S3, GitHub, Local).

### Immutability & Ransomware Protection (WORM)

- **WORM (Write-Once-Read-Many):** Monthly and Yearly archival backups are automatically locked with object-level retention.
- **Audit Logs:** All backup pipeline transitions, restores, and configuration changes are tracked in an immutable `BackupAuditLog`.
- **Anomalies:** The system runs AI-driven anomaly detection post-backup (via `HealthAnalyzer`) to detect sudden drops in collection counts or spikes in encryption durations, alerting the team before ransomware corrupts historical backups.

## 1-Click Guided DR Workflow

In the event of a catastrophic failure (e.g., deleted production DB, corrupted data, infrastructure outage):

1. **Access the Backup Center:** Navigate to `/admin/backup-center` on the Admin Portal.
2. **Review Health:** The dashboard displays current DR Readiness and the latest successful, verified backups.
3. **Disaster Recovery Panel:** Go to the "Disaster Recovery" tab.
4. **Trigger Restore Wizard:**
   - Input the Backup ID of the last known good state.
   - The system performs a **Dry-Run Simulation** to verify version compatibility and estimate downtime.
   - The system automatically triggers a **Pre-Restore Rollback Snapshot**.
   - Data is downloaded, decrypted, decompressed, and restored to a staging environment.
   - **Post-Restore Smoke Tests** (14+ automated checks including Admin Access, Orders, Cloudinary Links) are executed.
   - If tests pass, an **Atomic Swap** replaces the corrupted production data with the recovered data.

## Cryptographic Key Rotation

Encryption keys are managed via the `EncryptionKeyHistory` model.

- Key rotation can be triggered from the "Retention & Keys" tab.
- New backups will use the new key (e.g., `v2`).
- Old backups will automatically use the key version indicated in their `manifest.json`.

## Manual Intervention (Emergency)

If the Admin Dashboard is entirely inaccessible:

1. Locate the raw backup archive (e.g., on S3).
2. Download the archive to a secure machine.
3. Run the decryption script (requires `BACKUP_ENCRYPTION_KEY`):
   ```bash
   node backend/scripts/decrypt-backup.js <archive-file>
   ```
4. Unzip the archive:
   ```bash
   tar -xzf decrypted_archive.tar.gz
   ```
5. Restore using MongoDB tools:
   ```bash
   mongorestore --uri="YOUR_MONGO_URI" ./dump
   ```
6. Run the offline verification script:
   ```bash
   node backend/scripts/verify-restore.js
   ```

## Testing & Drills

- The system automatically runs **Chaos Engineering Tests** (e.g., `corrupted_backup` simulation) weekly.
- It is recommended to perform a full DR Drill manually every quarter using the "Initiate Manual Drill" button in the DR Panel.
