import BackupRecord, { BackupStatus } from '../../models/BackupRecord';
import logger from '../../config/logger';

export class MetricsCollector {
  private static activePhases = new Map<
    string,
    { startTime: number; startCpu: NodeJS.CpuUsage; startMemory: number }
  >();

  /**
   * Mark the start of a phase in the backup process
   */
  public static startPhase(backupId: string, phaseName: BackupStatus): void {
    const key = `${backupId}:${phaseName}`;
    this.activePhases.set(key, {
      startTime: Date.now(),
      startCpu: process.cpuUsage(),
      startMemory: process.memoryUsage().rss,
    });
  }

  /**
   * Mark the end of a phase, calculate metrics, and update the BackupRecord
   */
  public static async endPhase(backupId: string, phaseName: BackupStatus): Promise<void> {
    const key = `${backupId}:${phaseName}`;
    const startData = this.activePhases.get(key);

    if (!startData) {
      logger.warn(
        `[METRICS] Tried to end phase ${phaseName} for ${backupId} but it wasn't started`,
      );
      return;
    }

    const endTime = Date.now();
    const durationMs = endTime - startData.startTime;

    const cpuDiff = process.cpuUsage(startData.startCpu);
    // Simple rough % calculation over the duration
    const cpuTotalMs = (cpuDiff.user + cpuDiff.system) / 1000;
    const cpuPercent = durationMs > 0 ? (cpuTotalMs / durationMs) * 100 : 0;

    const endMemory = process.memoryUsage().rss;
    const memoryPeakMB = Math.round(Math.max(startData.startMemory, endMemory) / 1024 / 1024);

    this.activePhases.delete(key);

    try {
      const updateData: any = {
        [`metrics.phaseTimings.${phaseName}`]: {
          startedAt: new Date(startData.startTime),
          completedAt: new Date(endTime),
          durationMs,
        },
      };

      // Set specific duration fields based on phase
      if (phaseName === 'compressing') updateData['metrics.compressionDurationMs'] = durationMs;
      if (phaseName === 'encrypting') updateData['metrics.encryptionDurationMs'] = durationMs;
      if (phaseName === 'signing') updateData['metrics.signingDurationMs'] = durationMs;
      if (phaseName === 'uploading') updateData['metrics.uploadDurationMs'] = durationMs;
      if (phaseName === 'verifying') updateData['metrics.verificationDurationMs'] = durationMs;

      // Update peaks if higher
      const record = await BackupRecord.findOne({ backupId });
      if (record) {
        if (!record.metrics.cpuPeakPercent || cpuPercent > record.metrics.cpuPeakPercent) {
          updateData['metrics.cpuPeakPercent'] = Math.round(cpuPercent * 100) / 100;
        }
        if (!record.metrics.memoryPeakMB || memoryPeakMB > record.metrics.memoryPeakMB) {
          updateData['metrics.memoryPeakMB'] = memoryPeakMB;
        }

        await BackupRecord.updateOne({ backupId }, { $set: updateData });
      }
    } catch (err: any) {
      logger.error(`[METRICS] Failed to save metrics for ${phaseName}: ${err.message}`);
    }
  }

  /**
   * Calculates throughput in MB/s
   */
  public static calculateThroughput(bytes: number, durationMs: number): number {
    if (durationMs === 0) return 0;
    const mb = bytes / (1024 * 1024);
    const seconds = durationMs / 1000;
    return Math.round((mb / seconds) * 100) / 100;
  }
}
