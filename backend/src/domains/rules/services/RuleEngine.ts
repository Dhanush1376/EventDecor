import mongoose from 'mongoose';
import BusinessRule from '../models/BusinessRule';
import ApprovalRequest from '../models/ApprovalRequest';

export class RuleEngine {
  /**
   * Evaluates an entity against all active rules and pauses it if approvals are needed.
   * Returns { requiresApproval: boolean, matchedRules: string[] }
   */
  static async evaluate(
    entity: any,
    entityType: 'Order' | 'RentalOrder' | 'CustomOrder',
    session?: mongoose.ClientSession,
  ): Promise<{ requiresApproval: boolean; requestsCreated: any[] }> {
    const activeRules = await BusinessRule.find({ isActive: true, targetEntity: entityType }).sort({
      priority: 1,
    });

    if (!activeRules.length) return { requiresApproval: false, requestsCreated: [] };

    let requiresApproval = false;
    const requestsCreated = [];

    for (const rule of activeRules) {
      let matched = false;

      // Evaluate conditions
      for (const condition of rule.conditions) {
        const entityValue = this.getFieldValue(entity, condition.field);

        switch (condition.operator) {
          case 'equals':
            matched = entityValue === condition.value;
            break;
          case 'not_equals':
            matched = entityValue !== condition.value;
            break;
          case 'greater_than':
            matched = entityValue > condition.value;
            break;
          case 'less_than':
            matched = entityValue < condition.value;
            break;
          case 'contains':
            matched = Array.isArray(entityValue)
              ? entityValue.includes(condition.value)
              : String(entityValue).includes(condition.value);
            break;
          case 'in':
            matched = Array.isArray(condition.value) && condition.value.includes(entityValue);
            break;
        }

        if (matched) break; // OR logic for now, could be enhanced to AND
      }

      if (matched) {
        if (rule.action === 'require_approval') {
          requiresApproval = true;
          const req = new ApprovalRequest({
            type: 'Rule Engine Override',
            requesterId: 'system',
            requesterName: 'Business Rule Engine',
            details: `Entity ${entityType} (${entity._id}) triggered rule: ${rule.name}`,
            amount: 'N/A',
            riskLevel: 'Medium',
            status: 'Pending',
            approveConsequence: `Allow ${entityType} operation to proceed.`,
            rejectConsequence: `Block ${entityType} operation.`,
          });

          if (session) await req.save({ session });
          else await req.save();

          requestsCreated.push(req);
        } else if (rule.action === 'reject') {
          throw new Error(`Rejected automatically by rule: ${rule.name}`);
        }
      }
    }

    return { requiresApproval, requestsCreated };
  }

  private static getFieldValue(obj: any, path: string) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
}
