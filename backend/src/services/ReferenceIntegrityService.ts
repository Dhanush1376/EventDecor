import mongoose, { ClientSession } from 'mongoose';
import logger from '../config/logger';
import CleanupAuditLog from '../models/CleanupAuditLog';

export interface CascadeRule {
  targetModel: string;
  targetField: string;
  action: 'pull' | 'nullify' | 'reassign' | 'softDelete' | 'anonymize' | 'deactivate';
  reassignValue?: any;
}

export class ReferenceIntegrityService {
  private static rules: Map<string, CascadeRule[]> = new Map();

  static register(modelName: string, rules: CascadeRule[]) {
    const existing = this.rules.get(modelName) || [];
    this.rules.set(modelName, [...existing, ...rules]);
    logger.info(`[ReferenceIntegrity] Registered ${rules.length} cascade rules for ${modelName}`);
  }

  static async onSoftDelete(
    sourceModelName: string,
    sourceDocId: string,
    sourceDoc: any,
    session?: ClientSession,
    auditLogId?: string,
  ) {
    const rules = this.rules.get(sourceModelName) || [];
    if (rules.length === 0) return;

    let auditLog;
    if (auditLogId) {
      auditLog = await CleanupAuditLog.findById(auditLogId).session(session || null);
    }

    for (const rule of rules) {
      try {
        const TargetModel = mongoose.models[rule.targetModel];
        if (!TargetModel) {
          logger.warn(`[ReferenceIntegrity] Target model ${rule.targetModel} not found`);
          continue;
        }

        let updatedCount = 0;

        switch (rule.action) {
          case 'pull': {
            const pullResult = await TargetModel.updateMany(
              { [rule.targetField]: sourceDocId },
              { $pull: { [rule.targetField]: sourceDocId } },
              { session },
            );
            updatedCount = pullResult.modifiedCount;
            break;
          }

          case 'nullify': {
            const nullResult = await TargetModel.updateMany(
              { [rule.targetField]: sourceDocId },
              { $set: { [rule.targetField]: null } },
              { session },
            );
            updatedCount = nullResult.modifiedCount;
            break;
          }

          case 'reassign': {
            if (rule.reassignValue === undefined) {
              logger.error(
                `[ReferenceIntegrity] Reassign value missing for ${rule.targetModel}.${rule.targetField}`,
              );
              continue;
            }
            const reassignResult = await TargetModel.updateMany(
              { [rule.targetField]: sourceDocId },
              { $set: { [rule.targetField]: rule.reassignValue } },
              { session },
            );
            updatedCount = reassignResult.modifiedCount;
            break;
          }

          case 'softDelete': {
            // Using updateMany with isDeleted: true instead of finding each doc to soft delete
            // For a deeper cascade, we could call .softDelete() on each document, but that might be heavy
            const softDelResult = await TargetModel.updateMany(
              { [rule.targetField]: sourceDocId },
              { $set: { isDeleted: true, deletedAt: new Date() } },
              { session },
            );
            updatedCount = softDelResult.modifiedCount;
            break;
          }

          case 'anonymize': {
            const anonymizeResult = await TargetModel.updateMany(
              { [rule.targetField]: sourceDocId },
              { $set: { [rule.targetField]: null, customerName: 'Deleted User' } },
              { session },
            );
            updatedCount = anonymizeResult.modifiedCount;
            break;
          }

          case 'deactivate': {
            const deactivateResult = await TargetModel.updateMany(
              { [rule.targetField]: sourceDocId },
              { $set: { isActive: false, status: 'inactive' } },
              { session },
            );
            updatedCount = deactivateResult.modifiedCount;
            break;
          }
        }

        if (updatedCount > 0) {
          logger.info(
            `[ReferenceIntegrity] Cascaded ${rule.action} to ${updatedCount} docs in ${rule.targetModel} (source: ${sourceModelName} ${sourceDocId})`,
          );
          if (auditLog) {
            auditLog.deletedReferences.push({
              targetModel: rule.targetModel,
              targetField: rule.targetField,
              targetDocId: 'multiple',
              action: rule.action,
            });
            auditLog.referencesUpdated += updatedCount;
          }
        }
      } catch (err: any) {
        logger.error(
          `[ReferenceIntegrity] Failed to execute cascade rule ${rule.action} for ${rule.targetModel}: ${err.message}`,
        );
      }
    }

    if (auditLog) {
      await auditLog.save({ session });
    }
  }
}
