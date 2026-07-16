import mongoose from 'mongoose';
import { randomUUID as uuidv4 } from 'crypto';
import WhatsAppConfigSnapshot from '../../../models/WhatsAppConfigSnapshot';
import WhatsAppAuditLog from '../../../models/WhatsAppAuditLog';
import WhatsAppAutomation from '../../../models/WhatsAppAutomation';
import WhatsAppTemplate from '../../../models/WhatsAppTemplate';
import WhatsAppRecipient from '../../../models/WhatsAppRecipient';
import WhatsAppProviderConfig from '../../../models/WhatsAppProviderConfig';
import WhatsAppRoutingRule from '../../../models/WhatsAppRoutingRule';
import WhatsAppCostConfig from '../../../models/WhatsAppCostConfig';
import logger from '../../../config/logger';

export class WhatsAppVersionService {
  /**
   * Logs a single atomic change to the Audit Log.
   */
  static async logChange({
    entityType,
    entityId,
    action,
    performedBy,
    ipAddress,
    userAgent,
    previousValue,
    newValue,
    changeDescription,
    reason,
    correlationId,
  }: {
    entityType: string;
    entityId: string;
    action: string;
    performedBy?: mongoose.Types.ObjectId;
    ipAddress?: string;
    userAgent?: string;
    previousValue?: any;
    newValue?: any;
    changeDescription?: string;
    reason?: string;
    correlationId?: string;
  }) {
    try {
      await WhatsAppAuditLog.create({
        entityType,
        entityId,
        action,
        performedBy,
        performedAt: new Date(),
        ipAddress,
        userAgent,
        previousValue,
        newValue,
        changeDescription,
        reason,
        correlationId: correlationId || uuidv4(),
      });
    } catch (err) {
      logger.error('[WhatsAppVersionService] Failed to log audit trail', err);
    }
  }

  /**
   * Creates a full system configuration snapshot.
   */
  static async createSnapshot(
    name: string,
    description: string,
    createdBy?: mongoose.Types.ObjectId,
  ) {
    const [automations, templates, recipients, providers, routingRules, costConfigs] =
      await Promise.all([
        WhatsAppAutomation.find({}).lean(),
        WhatsAppTemplate.find({}).lean(),
        WhatsAppRecipient.find({}).lean(),
        WhatsAppProviderConfig.find({}).lean(),
        WhatsAppRoutingRule.find({}).lean(),
        WhatsAppCostConfig.find({}).lean(),
      ]);

    const configData = {
      automations,
      templates,
      recipients,
      providers,
      routingRules,
      costConfigs,
    };

    const snapshot = await WhatsAppConfigSnapshot.create({
      snapshotId: `snap_${Date.now()}_${uuidv4().substring(0, 6)}`,
      name,
      description,
      createdBy,
      configData,
    });

    return snapshot;
  }

  /**
   * Rolls back the entire WhatsApp configuration state to a previous snapshot using ACID transactions.
   */
  static async rollbackToSnapshot(snapshotId: string, performedBy?: mongoose.Types.ObjectId) {
    const snapshot = await WhatsAppConfigSnapshot.findOne({ snapshotId }).lean();
    if (!snapshot) throw new Error('Snapshot not found');

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Clear all current collections
      await WhatsAppAutomation.deleteMany({}, { session });
      await WhatsAppTemplate.deleteMany({}, { session });
      await WhatsAppRecipient.deleteMany({}, { session });
      await WhatsAppProviderConfig.deleteMany({}, { session });
      await WhatsAppRoutingRule.deleteMany({}, { session });
      await WhatsAppCostConfig.deleteMany({}, { session });

      // 2. Insert snapshot data
      const data: any = snapshot.configData;

      if (data.automations?.length)
        await WhatsAppAutomation.insertMany(data.automations, { session });
      if (data.templates?.length) await WhatsAppTemplate.insertMany(data.templates, { session });
      if (data.recipients?.length) await WhatsAppRecipient.insertMany(data.recipients, { session });
      if (data.providers?.length)
        await WhatsAppProviderConfig.insertMany(data.providers, { session });
      if (data.routingRules?.length)
        await WhatsAppRoutingRule.insertMany(data.routingRules, { session });
      if (data.costConfigs?.length)
        await WhatsAppCostConfig.insertMany(data.costConfigs, { session });

      await session.commitTransaction();

      // Log the massive rollback event outside the transaction so it persists even if this throws
      await this.logChange({
        entityType: 'config',
        entityId: 'global',
        action: 'rollback',
        performedBy,
        changeDescription: `Rolled back to snapshot ${snapshot.name} (${snapshotId})`,
        newValue: { snapshotId },
        reason: 'System Restore',
        correlationId: uuidv4(),
      });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Safety check: Before a template is deleted, ensure no active automation relies on it.
   */
  static async checkDependenciesBeforeDelete(entityType: string, entityId: string): Promise<void> {
    if (entityType === 'template') {
      const dependents = await WhatsAppAutomation.find({ activeTemplateId: entityId }).select(
        'displayName',
      );
      if (dependents.length > 0) {
        const names = dependents.map((d) => d.displayName).join(', ');
        throw new Error(
          `Cannot delete Template because it is currently used by Automations: ${names}`,
        );
      }
    } else if (entityType === 'recipient') {
      const dependents = await WhatsAppAutomation.find({
        'recipientRoles.recipientId': entityId,
      }).select('displayName');
      if (dependents.length > 0) {
        const names = dependents.map((d) => d.displayName).join(', ');
        throw new Error(
          `Cannot delete Recipient because it is currently configured in Automations: ${names}`,
        );
      }
    }
  }
}
