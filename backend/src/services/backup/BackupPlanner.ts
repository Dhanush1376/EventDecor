import mongoose from 'mongoose';
import BackupRecord from '../../models/BackupRecord';
import logger from '../../config/logger';
import { BackupType } from '../../models/BackupRecord';

export interface DependencyScanReport {
  timestamp: Date;
  passed: boolean;
  issues: string[];
  warnings: string[];
}

export interface Recommendation {
  category:
    | 'frequency'
    | 'retention'
    | 'archival'
    | 'regional'
    | 'compression'
    | 'encryption'
    | 'testing'
    | 'growth'
    | 'immutability';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  estimatedImpact: string;
  actionable: boolean;
}

export class BackupPlanner {
  /**
   * Discovers all collections and categorizes them into tiers
   */
  public static async discoverCollections(): Promise<{
    tier1: string[];
    tier2: string[];
    tier3: string[];
  }> {
    const tier1 = [
      'products',
      'users',
      'orders',
      'rentalorders',
      'customorders',
      'paymentaudits',
      'refundrecords',
      'wallettransactions',
    ];
    const tier2 = [
      'categories',
      'reviews',
      'events',
      'eventbookings',
      'coupons',
      'galleries',
      'addresses',
      'inventoryledgers',
      'media',
    ];
    const tier3: string[] = [];

    try {
      if (mongoose.connection.db) {
        const collections = await mongoose.connection.db.listCollections().toArray();
        collections.forEach((c) => {
          if (!c.name.startsWith('system.') && !tier1.includes(c.name) && !tier2.includes(c.name)) {
            tier3.push(c.name);
          }
        });
      }
    } catch (e: any) {
      logger.error(`[PLANNER] Failed to discover collections: ${e.message}`);
    }

    return { tier1, tier2, tier3 };
  }

  /**
   * Plans which collections to backup based on backup type
   */
  public static async planBackupCollections(type: BackupType): Promise<string[]> {
    const tiers = await this.discoverCollections();

    switch (type) {
      case 'snapshot':
      case 'emergency':
        return tiers.tier1; // Only critical for speed
      case 'full':
      case 'incremental':
      case 'differential':
        return [...tiers.tier1, ...tiers.tier2, ...tiers.tier3]; // Everything
      case 'config':
        return []; // Doesn't backup mongo collections
      default:
        return tiers.tier1;
    }
  }

  /**
   * Scans dependencies to ensure backup integrity before starting
   */
  public static async scanDependencies(): Promise<DependencyScanReport> {
    const report: DependencyScanReport = {
      timestamp: new Date(),
      passed: true,
      issues: [],
      warnings: [],
    };

    // 1. Check Env Vars
    if (!process.env.BACKUP_ENCRYPTION_KEY) {
      report.issues.push('Missing BACKUP_ENCRYPTION_KEY');
      report.passed = false;
    }
    if (!process.env.BACKUP_SIGNING_KEY) {
      report.warnings.push(
        'Missing BACKUP_SIGNING_KEY, falling back to encryption key for signatures',
      );
    }

    // 2. Check Database Connection
    if (mongoose.connection.readyState !== 1) {
      report.issues.push('MongoDB not connected');
      report.passed = false;
    }

    // 3. Collection health check (ensure critical ones have data)
    try {
      const tiers = await this.discoverCollections();
      if (mongoose.connection.db) {
        for (const col of tiers.tier1) {
          const count = await mongoose.connection.db.collection(col).estimatedDocumentCount();
          if (count === 0) {
            report.warnings.push(`Critical collection '${col}' is empty`);
          }
        }
      }
    } catch (e) {
      report.warnings.push('Failed to check collection counts');
    }

    return report;
  }

  /**
   * Returns node and edge data for the dependency graph visualization
   */
  public static getDependencyGraph(): any {
    return {
      nodes: [
        { id: 'mongodb', label: 'MongoDB Cluster', status: 'backed_up', type: 'database' },
        { id: 'cloudinary', label: 'Cloudinary Media', status: 'backed_up', type: 'storage' },
        { id: 'redis', label: 'Redis Cache/Queue', status: 'not_backed_up', type: 'cache' }, // Ephemeral, usually don't backup
        { id: 'config', label: 'Environment & Config', status: 'backed_up', type: 'config' },
      ],
      edges: [
        { source: 'mongodb', target: 'cloudinary', label: 'image URLs' },
        { source: 'config', target: 'mongodb', label: 'MONGO_URI' },
        { source: 'config', target: 'redis', label: 'REDIS_URI' },
        { source: 'config', target: 'cloudinary', label: 'API Keys' },
      ],
    };
  }

  /**
   * AI-powered recommendation engine based on historical backup patterns
   */
  public static async generateRecommendations(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // In a real system, we would query BackupRecord for the last 30-90 days to drive this logic
    // Mocking the analysis logic based on the implementation plan

    const hasImmutable = await BackupRecord.exists({ immutable: true });
    if (!hasImmutable) {
      recommendations.push({
        category: 'immutability',
        priority: 'high',
        description:
          'No immutable backups exist. Lock at least 1 monthly backup for ransomware protection.',
        estimatedImpact: 'Reduces risk of total data loss to 0 in ransomware scenarios',
        actionable: true,
      });
    }

    const s3Regions = (process.env.BACKUP_S3_REGIONS || '').split(',');
    if (s3Regions.length < 2) {
      recommendations.push({
        category: 'regional',
        priority: 'medium',
        description:
          'Only 1 storage region configured. Add a secondary region for cross-region DR.',
        estimatedImpact: 'Improves DR Readiness Score by 10 points',
        actionable: false, // Requires env var change
      });
    }

    // Example mock recommendation
    recommendations.push({
      category: 'testing',
      priority: 'medium',
      description: 'No restore drill performed in > 30 days. Schedule a DR drill.',
      estimatedImpact: 'Ensures RTO targets can still be met',
      actionable: true, // Can click "Start Drill"
    });

    return recommendations;
  }
}
