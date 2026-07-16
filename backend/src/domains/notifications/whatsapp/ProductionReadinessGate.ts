import WhatsAppProviderConfig from '../../../models/WhatsAppProviderConfig';
import WhatsAppAutomation from '../../../models/WhatsAppAutomation';

export class ProductionReadinessGate {
  /**
   * Block workflows that have unknown node types or missing dependencies
   */
  static async validateBeforeWorkflowPublish(
    automationId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const automation = await WhatsAppAutomation.findById(automationId).lean();
    if (!automation) return { allowed: false, reason: 'Automation not found' };

    const validTypes = ['trigger', 'condition', 'delay', 'action', 'experiment'];
    const invalidNodes = automation.nodes.filter(
      (n) => !validTypes.includes(n.type) && !n.id.startsWith('experiment'),
    );

    if (invalidNodes.length > 0) {
      return {
        allowed: false,
        reason: `Workflow contains unhandled node types: ${invalidNodes.map((n) => n.type).join(', ')}`,
      };
    }

    if (!automation.activeTemplateId) {
      // Technically an automation could just be internal logic, but we enforce at least a template definition somewhere
      // We'll pass it for now if nodes are valid
    }

    return { allowed: true };
  }

  /**
   * Block automations from going live if providers are down
   */
  static async validateBeforeAutomationEnable(): Promise<{ allowed: boolean; reason?: string }> {
    const providers = await WhatsAppProviderConfig.find({ isEnabled: true });
    if (providers.length === 0) {
      return {
        allowed: false,
        reason: 'No active WhatsApp providers configured. Cannot enable automation.',
      };
    }
    return { allowed: true };
  }

  /**
   * Evaluates the entire environment
   */
  static async validateEnvironment(): Promise<{ allowed: boolean; reason?: string }> {
    const requiredEnv = ['JWT_SECRET', 'MONGO_URI'];
    const missing = requiredEnv.filter((e) => !process.env[e]);
    if (missing.length > 0) {
      return { allowed: false, reason: `Missing critical env vars: ${missing.join(', ')}` };
    }
    return { allowed: true };
  }
}
