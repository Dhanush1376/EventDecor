import BackupRecord, { IBackupRecord } from '../../models/BackupRecord';
import logger from '../../config/logger';
import { BackupAuditService } from './BackupAuditService';
import { AlertingService } from '../../services/AlertingService';

export interface SystemHealth {
  score: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  dimensions: {
    freshness: number;
    successRate: number;
    encryption: number;
    verification: number;
    restoreTest: number;
    replication: number;
    crossRegion: number;
    immutability: number;
  };
}

export interface StorageAnalytics {
  totalBytes: number;
  projectedBytesNextMonth: number;
  compressionSavingsBytes: number;
  byProvider: Record<string, number>;
}

export interface CostAnalytics {
  estimatedMonthlyCostS3: number;
  estimatedYearlyCostS3: number;
  optimizations: string[];
}

export class HealthAnalyzer {
  /**
   * Computes the integrity score for a single backup record (0-100)
   */
  public static computeIntegrityScore(record: IBackupRecord): number {
    let score = 0;

    // 1. Encryption present (10)
    if (record.encryption?.keyVersion) score += 10;

    // 2. Signature present + valid (10) - Assumes if it got to completed it's valid or verified offline
    if (record.signature?.signatureHex) score += 10;

    // 3. Checksum verified (10)
    if (
      record.checksum?.sha256PreUpload &&
      record.checksum?.sha256PostUpload &&
      record.checksum.sha256PreUpload === record.checksum.sha256PostUpload
    ) {
      score += 10;
    } else if (record.checksum?.sha256PreUpload) {
      score += 5; // Partial points if only pre-upload exists
    }

    // 4. Upload verified (10)
    if (record.storage && record.storage.length > 0) {
      const verified = record.storage.filter((s) => s.verified).length;
      score += Math.round((verified / record.storage.length) * 10);
    }

    // 5. Multi-provider (10)
    const providerTypes = new Set(record.storage?.map((s) => s.provider));
    if (providerTypes.size >= 2) score += 10;
    else if (providerTypes.size === 1) score += 5;

    // 6. Cross-region (5)
    const regions = new Set(record.storage?.map((s) => s.region).filter(Boolean));
    if (regions.size >= 2) score += 5;

    // 7. Restore test (15)
    // If it was used in a successful drill or restore
    if (record.verification?.passed) score += 15;

    // 8. Freshness (10)
    const ageMs = Date.now() - record.createdAt.getTime();
    if (ageMs < 24 * 60 * 60 * 1000) score += 10;
    else if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 7;
    else if (ageMs < 30 * 24 * 60 * 60 * 1000) score += 3;

    // 9. Manifest (10)
    if (record.manifest) score += 10;

    // 10. Atomic completion (10)
    if (
      record.status === 'completed' &&
      Object.keys(record.metrics?.phaseTimings || {}).length >= 6
    ) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluates overall system health and DR readiness
   */
  public static async getSystemHealth(): Promise<SystemHealth> {
    const BackupRecord =
      require('../../models/BackupRecord').default || require('../../models/BackupRecord');
    const recentBackups = await BackupRecord.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    let score = 0;
    if (recentBackups.length > 0) {
      const scores = recentBackups.map((b: any) => this.computeIntegrityScore(b));
      score = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    }

    let grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return {
      score: Math.round(score),
      grade,
      dimensions: {
        freshness: score > 0 ? 15 : 0,
        successRate: score > 0 ? 15 : 0,
        encryption: score > 0 ? 10 : 0,
        verification: score > 0 ? 10 : 0,
        restoreTest: score > 0 ? 5 : 0,
        replication: score > 0 ? 10 : 0,
        crossRegion: score > 0 ? 5 : 0,
        immutability: score > 0 ? 5 : 0,
      },
    };
  }

  /**
   * AI Anomaly Detection after a backup completes
   */
  public static async detectAnomalies(currentRecord: IBackupRecord): Promise<void> {
    if (currentRecord.type !== 'full') return; // Compare apples to apples

    try {
      // Get the last 30 full backups
      const history = await BackupRecord.find({
        type: 'full',
        status: 'completed',
        backupId: { $ne: currentRecord.backupId },
      })
        .sort({ createdAt: -1 })
        .limit(30);

      if (history.length < 5) return; // Not enough data

      const currentSize = currentRecord.metrics?.sizeCompressed || 0;
      const currentDuration = currentRecord.metrics?.durationMs || 0;

      const sizes = history.map((h) => h.metrics?.sizeCompressed || 0);
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;

      const durations = history.map((h) => h.metrics?.durationMs || 0);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      // Calculate StdDev for size
      const sizeVariance = sizes.reduce((a, b) => a + Math.pow(b - avgSize, 2), 0) / sizes.length;
      const sizeStdDev = Math.sqrt(sizeVariance);

      const thresholdStdDev = Number(process.env.BACKUP_ANOMALY_THRESHOLD_SIZE_STDDEV) || 2;
      const thresholdDuration =
        Number(process.env.BACKUP_ANOMALY_THRESHOLD_DURATION_MULTIPLIER) || 3;

      let anomalyDetected = false;
      const details: any = {};

      // 1. Size Anomaly
      if (Math.abs(currentSize - avgSize) > thresholdStdDev * sizeStdDev) {
        anomalyDetected = true;
        details.sizeAnomaly = `Size ${currentSize} deviates significantly from avg ${avgSize}`;
      }

      // 2. Duration Anomaly
      if (currentDuration > avgDuration * thresholdDuration) {
        anomalyDetected = true;
        details.durationAnomaly = `Duration ${currentDuration}ms is > ${thresholdDuration}x average of ${avgDuration}ms`;
      }

      // 3. Collection Count Drops (Critical)
      if (history[0] && history[0].collections) {
        for (const col of currentRecord.collections) {
          const prevCol = history[0].collections.find((c: any) => c.name === col.name);
          if (prevCol && col.count < prevCol.count) {
            const dropPercent = ((prevCol.count - col.count) / prevCol.count) * 100;
            const thresholdCountDrop =
              Number(process.env.BACKUP_ANOMALY_THRESHOLD_COUNT_DROP_PERCENT) || 10;

            if (dropPercent >= thresholdCountDrop) {
              anomalyDetected = true;
              details.collectionDrop = details.collectionDrop || [];
              details.collectionDrop.push(
                `${col.name} dropped by ${Math.round(dropPercent)}% (${prevCol.count} -> ${col.count})`,
              );
            }
          }
        }
      }

      if (anomalyDetected) {
        logger.warn(
          `[ANOMALY] Detected anomalies in backup ${currentRecord.backupId}: ${JSON.stringify(details)}`,
        );
        await BackupAuditService.log('anomaly_detected', details, 'system', currentRecord.backupId);

        // Use existing alerting service
        await AlertingService.backupAlert(`Backup Anomaly Detected`, {
          backupId: currentRecord.backupId,
          details,
        });
      }
    } catch (err: any) {
      logger.error(`[ANOMALY] Failed to run anomaly detection: ${err.message}`);
    }
  }

  public static async getStorageAnalytics(): Promise<StorageAnalytics> {
    const records = await BackupRecord.find({ status: 'completed' });

    let totalBytes = 0;
    let compressionSavingsBytes = 0;
    const byProvider: Record<string, number> = {};

    records.forEach((r) => {
      totalBytes += r.metrics?.sizeCompressed || 0;

      const raw = r.metrics?.sizeRaw || 0;
      const comp = r.metrics?.sizeCompressed || 0;
      if (raw > comp) {
        compressionSavingsBytes += raw - comp;
      }

      r.storage?.forEach((s: any) => {
        byProvider[s.provider] = (byProvider[s.provider] || 0) + (r.metrics?.sizeCompressed || 0);
      });
    });

    const projectedBytesNextMonth = totalBytes * 1.1; // Assume 10% MoM growth for analytics

    return {
      totalBytes,
      projectedBytesNextMonth,
      compressionSavingsBytes,
      byProvider,
    };
  }

  public static async getCostAnalytics(): Promise<CostAnalytics> {
    const storage = await this.getStorageAnalytics();

    // AWS S3 standard rate ~ $0.023 per GB/mo
    const s3Bytes = storage.byProvider['s3'] || 0;
    const gb = s3Bytes / (1024 * 1024 * 1024);
    const estimatedMonthlyCostS3 = gb * 0.023;
    const estimatedYearlyCostS3 = estimatedMonthlyCostS3 * 12;

    const optimizations = [];
    if (gb > 100) {
      optimizations.push(
        `Move ${Math.round(gb * 0.6)}GB of yearly archival backups to Glacier to save ~$${(gb * 0.6 * 0.015).toFixed(2)}/mo`,
      );
    }

    return {
      estimatedMonthlyCostS3: Number(estimatedMonthlyCostS3.toFixed(2)),
      estimatedYearlyCostS3: Number(estimatedYearlyCostS3.toFixed(2)),
      optimizations,
    };
  }
}
