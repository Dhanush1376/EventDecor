import { AutomationContext } from './types';

export class WhatsAppConditionEvaluator {
  static async evaluate(conditions: any[], context: AutomationContext): Promise<string[]> {
    const triggeredBadges: string[] = [];

    for (const condition of conditions) {
      if (!condition.enabled) continue;

      const value = this.getValueFromPath(context, condition.field);
      let isMatch = false;

      switch (condition.operator) {
        case 'gt':
          isMatch = value > condition.value;
          break;
        case 'lt':
          isMatch = value < condition.value;
          break;
        case 'eq':
          isMatch = value == condition.value;
          break;
        case 'gte':
          isMatch = value >= condition.value;
          break;
        case 'lte':
          isMatch = value <= condition.value;
          break;
        case 'contains':
          isMatch = Array.isArray(value)
            ? value.includes(condition.value)
            : typeof value === 'string' && value.includes(condition.value);
          break;
        case 'exists':
          isMatch = value !== undefined && value !== null;
          break;
        case 'is_true':
          isMatch = value === true;
          break;
      }

      if (isMatch) {
        triggeredBadges.push(`${condition.emoji} ${condition.badge}`.trim());
      }
    }

    return triggeredBadges;
  }

  private static getValueFromPath(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }
}
