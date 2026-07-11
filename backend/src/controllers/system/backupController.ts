import { Request, Response } from 'express';
import { BackupOrchestrator } from '../../services/backup/BackupOrchestrator';
import { HealthAnalyzer } from '../../services/backup/HealthAnalyzer';
import { RestoreManager } from '../../services/backup/RestoreManager';
import BackupRecord from '../../models/BackupRecord';
import BackupAuditLog from '../../models/BackupAuditLog';
import EncryptionKeyHistory from '../../models/EncryptionKeyHistory';
import { BackupPlanner } from '../../services/backup/BackupPlanner';
import { VerificationService } from '../../services/backup/VerificationService';
import storageManager from '../../services/backup/StorageManager';

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const health = await HealthAnalyzer.getSystemHealth();
    const recommendations = await BackupPlanner.generateRecommendations();

    // Quick overview stats
    const totalBackups = await BackupRecord.countDocuments({ status: 'completed' });
    const activeProvidersCount = storageManager.getProviders().length;

    res.json({
      health,
      recommendations,
      stats: { totalBackups, activeProvidersCount },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const records = await BackupRecord.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await BackupRecord.countDocuments({});

    res.json({
      records,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getBackupDetail = async (req: Request, res: Response) => {
  try {
    const record = await BackupRecord.findOne({ backupId: req.params.id });
    if (!record) return res.status(404).json({ message: 'Backup not found' });

    const score = HealthAnalyzer.computeIntegrityScore(record);

    res.json({ record, integrityScore: score });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const triggerBackup = async (req: Request, res: Response) => {
  try {
    const { type, schedule } = req.body;
    // Asynchronous start
    const record = await BackupOrchestrator.runBackup(
      type || 'full',
      schedule || 'manual',
      'admin',
    );
    res.status(202).json({ message: 'Backup started', backupId: record.backupId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getStorageAnalytics = async (req: Request, res: Response) => {
  try {
    const data = await HealthAnalyzer.getStorageAnalytics();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const simulateRestore = async (req: Request, res: Response) => {
  try {
    const { backupId } = req.body;
    const simulation = await RestoreManager.simulateRestore(backupId, req.body);
    res.json(simulation);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const executeRestore = async (req: Request, res: Response) => {
  try {
    const { backupId } = req.body;
    // Async execution
    // eslint-disable-next-line no-console
    RestoreManager.executeRestore(backupId, req.body).catch((e: any) => console.error(e));
    res.status(202).json({ message: 'Restore pipeline started' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getAuditTrail = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const logs = await BackupAuditLog.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getDependencyGraph = async (req: Request, res: Response) => {
  try {
    const graph = BackupPlanner.getDependencyGraph();
    res.json(graph);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const runChaosTest = async (req: Request, res: Response) => {
  try {
    const { scenario } = req.body;
    // eslint-disable-next-line no-console
    VerificationService.runChaosTest(scenario).catch((e: any) => console.error(e));
    res.status(202).json({ message: 'Chaos test initiated' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getKeyHistory = async (req: Request, res: Response) => {
  try {
    const history = await EncryptionKeyHistory.find({}).sort({ createdAt: -1 });
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
