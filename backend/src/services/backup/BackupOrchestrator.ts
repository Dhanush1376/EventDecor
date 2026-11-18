import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import BackupRecord, {
  BackupType,
  BackupSchedule,
  BackupStatus,
  IBackupRecord,
} from '../../models/BackupRecord';
import { BackupAuditService } from './BackupAuditService';
import { BackupPlanner } from './BackupPlanner';
import { BackupExecutor } from './BackupExecutor';
import { MetricsCollector } from './MetricsCollector';
import storageManager from './StorageManager';
import logger from '../../config/logger';

export class BackupOrchestrator {
  private static readonly VALID_TRANSITIONS: Record<BackupStatus, BackupStatus[]> = {
    preparing: ['dumping', 'failed'],
    dumping: ['compressing', 'failed'],
    compressing: ['encrypting', 'failed'],
    encrypting: ['signing', 'failed'],
    signing: ['uploading', 'failed'],
    uploading: ['verifying', 'failed'],
    verifying: ['completed', 'failed', 'rolled_back'],
    completed: [],
    failed: ['rolled_back'],
    rolled_back: [],
  };

  /**
   * Main entry point to start a backup
   */
  public static async runBackup(
    type: BackupType,
    schedule: BackupSchedule,
    triggerSource: string = 'system',
  ): Promise<IBackupRecord> {
    const backupId = crypto.randomUUID();

    // Create initial record
    const record = await BackupRecord.create({
      backupId,
      type,
      schedule,
      status: 'preparing',
      collections: [],
      metadata: { triggerSource, environment: process.env.NODE_ENV },
    });

    await BackupAuditService.log('backup_created', { type, schedule }, triggerSource, backupId);

    // We run the pipeline asynchronously so we can return the pending record immediately
    // to the controller, while it processes in the background.
    this.executePipeline(backupId).catch((err) => {
      logger.error(`[ORCHESTRATOR] Unhandled pipeline error for ${backupId}: ${err.message}`);
    });

    return record;
  }

  /**
   * The atomic state machine pipeline
   */
  private static async executePipeline(backupId: string): Promise<void> {
    let record = await BackupRecord.findOne({ backupId });
    if (!record) return;

    const workDir = path.join(os.tmpdir(), `backup_${backupId}`);

    try {
      await fs.promises.mkdir(workDir, { recursive: true });

      // 1. PREPARING -> DUMPING
      record = await this.transitionState(record, 'dumping', 'Planning collections');
      const collectionsToBackup = await BackupPlanner.planBackupCollections(record.type);

      let _totalSize = 0;
      let _totalRecords = 0;

      // Ensure work dir exists
      await fs.promises.mkdir(workDir, { recursive: true });

      // For each collection, stream -> json -> compress -> encrypt -> file
      // Then we will tar them up or upload them individually.
      // We will upload individually for now to avoid tar dependencies.
      for (const col of collectionsToBackup) {
        const outPath = path.join(workDir, `${col}.enc`);
        // The executor handles Dump -> Compress -> Encrypt in a single pass-through stream
        const stats = await BackupExecutor.streamCollection(col, outPath);
        _totalSize += stats.sizeBytes;
        _totalRecords += stats.recordCount;
      }

      // Update record with actual collections backed up
      record.collections = collectionsToBackup.map((c) => ({ name: c, count: 0, sizeBytes: 0 })); // We would map actual stats here

      // 2 & 3. COMPRESSING & ENCRYPTING (Handled inline by executor stream)
      record = await this.transitionState(record, 'compressing', 'Compressing stream');
      record = await this.transitionState(record, 'encrypting', 'Encrypting stream');

      // 4. ENCRYPTING -> SIGNING
      record = await this.transitionState(record, 'signing', 'Generating manifest and signatures');
      await BackupExecutor.generateManifest(record, workDir);

      // 5. SIGNING -> UPLOADING
      record = await this.transitionState(record, 'uploading', 'Uploading to multi-providers');

      const providers = storageManager.getProviders();
      const storageRecords: any[] = [];
      const remoteDir = `${record.backupId}`;
      const files = [
        { local: path.join(workDir, '_manifest.json'), remote: `${remoteDir}/_manifest.json` },
        ...collectionsToBackup.map((col) => ({
          local: path.join(workDir, `${col}.enc`),
          remote: `${remoteDir}/${col}.enc`,
        })),
      ];
      const sourceChecksums = new Map<string, string>();
      for (const f of files) {
        sourceChecksums.set(f.remote, await this.sha256File(f.local));
      }
      const uploaded: { provider: (typeof providers)[number]; storageRecord: any }[] = [];

      // Upload manifest and all collection files to all providers
      for (const provider of providers) {
        try {
          for (const f of files) {
            await provider.upload(f.local, f.remote, {
              immutable: f.remote.endsWith('.enc') ? record.immutable : undefined,
            });
          }

          const storageRecord = {
            provider: provider.type,
            region: provider.region,
            path: remoteDir,
            verified: false,
          };
          storageRecords.push(storageRecord);
          uploaded.push({ provider, storageRecord });
        } catch (e: any) {
          logger.error(`[ORCHESTRATOR] Upload failed to ${provider.name}: ${e.message}`);
        }
      }

      // 6. UPLOADING -> VERIFYING
      record = await this.transitionState(
        record,
        'verifying',
        'Verifying checksums and signatures',
      );

      // Re-read every uploaded file from each provider and compare with the source checksum.
      for (const { provider, storageRecord } of uploaded) {
        try {
          let allMatch = true;
          for (const f of files) {
            if (!(await provider.verify(f.remote, sourceChecksums.get(f.remote)!))) {
              allMatch = false;
              logger.error(`[ORCHESTRATOR] Checksum mismatch for ${f.remote} on ${provider.name}`);
              break;
            }
          }
          storageRecord.verified = allMatch;
        } catch (e: any) {
          logger.error(`[ORCHESTRATOR] Verification failed on ${provider.name}: ${e.message}`);
        }
      }
      record.storage = storageRecords;

      const verified = storageRecords.filter((s) => s.verified);
      if (verified.length === 0) {
        throw new Error('No storage provider holds a verified copy of this backup');
      }

      // 7. VERIFYING -> COMPLETED
      const offsite = verified.some((s) => s.provider !== 'local');
      if (!offsite) {
        logger.warn(
          `[ORCHESTRATOR] Backup ${record.backupId} is stored on the local disk only (not off-site). Container disks are ephemeral; rely on Atlas snapshots for recovery.`,
        );
      }
      record = await this.transitionState(
        record,
        'completed',
        offsite
          ? `Verified on ${verified.length} provider(s)`
          : 'Verified on local disk only - NOT an off-site backup',
      );

      // Post-backup analytics
      // await HealthAnalyzer.detectAnomalies(record);
    } catch (err: any) {
      logger.error(`[ORCHESTRATOR] Backup ${backupId} failed: ${err.message}`);
      if (record) {
        await this.transitionState(record, 'failed', `Error: ${err.message}`);
      }
    } finally {
      // Cleanup temp directory
      try {
        await fs.promises.rm(workDir, { recursive: true, force: true });
      } catch (_e) {}
    }
  }

  private static async sha256File(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    for await (const chunk of fs.createReadStream(filePath)) {
      hash.update(chunk);
    }
    return hash.digest('hex');
  }

  /**
   * Guards state transitions, logs audits, and captures metrics
   */
  private static async transitionState(
    record: IBackupRecord,
    newStatus: BackupStatus,
    reason: string,
  ): Promise<IBackupRecord> {
    const oldStatus = record.status;
    const allowed = this.VALID_TRANSITIONS[oldStatus];

    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid state transition: ${oldStatus} -> ${newStatus}`);
    }

    // End previous phase metrics
    if (oldStatus !== 'preparing') {
      await MetricsCollector.endPhase(record.backupId, oldStatus);
    }

    // Start new phase metrics
    if (newStatus !== 'completed' && newStatus !== 'failed' && newStatus !== 'rolled_back') {
      MetricsCollector.startPhase(record.backupId, newStatus);
    }

    // Update DB
    record.status = newStatus;
    await record.save();

    // Audit
    await BackupAuditService.logStateTransition(record.backupId, oldStatus, newStatus, reason);

    return record;
  }
}
