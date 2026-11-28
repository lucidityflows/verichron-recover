import { Logger } from '@nestjs/common';
import { WorkflowCondition } from '@verichron/contracts';
import { WorkflowConditionOperator } from '@verichron/enums';

/**
 * Condition Evaluator Helper
 *
 * Copied and adapted from api-workflows/src/engine/engine.service.ts
 * Used for evaluating workflow rule conditions and escalation rule conditions
 */
export class ConditionEvaluator {
  private static readonly logger = new Logger(ConditionEvaluator.name);

  /**
   * Evaluate all conditions for a rule
   * Returns true if ALL conditions are met (AND logic)
   */
  static checkConditions(conditions: WorkflowCondition[], payload: any): boolean {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions means always execute
    }

    return conditions.every((condition) => {
      try {
        return this.evaluateCondition(condition, payload);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Error evaluating condition for field "${condition.field}": ${errorMessage}`
        );
        return false;
      }
    });
  }

  /**
   * Evaluate a single condition against the payload
   */
  static evaluateCondition(condition: WorkflowCondition, payload: any): boolean {
    // Access payload field dynamically (supports nested fields with dot notation)
    const payloadValue = this.getNestedValue(payload, condition.field);

    if (payloadValue === undefined || payloadValue === null) {
      this.logger.debug(
        `Condition field "${condition.field}" not found in payload for operator ${condition.operator}.`
      );
      return false;
    }

    switch (condition.operator) {
      case WorkflowConditionOperator.EQUALS:
        return payloadValue === condition.value;

      case WorkflowConditionOperator.NOT_EQUALS:
        return payloadValue !== condition.value;

      case WorkflowConditionOperator.GREATER_THAN:
        return typeof payloadValue === 'number' &&
               typeof condition.value === 'number' &&
               payloadValue > condition.value;

      case WorkflowConditionOperator.LESS_THAN:
        return typeof payloadValue === 'number' &&
               typeof condition.value === 'number' &&
               payloadValue < condition.value;

      case WorkflowConditionOperator.GREATER_THAN_OR_EQUAL:
        return typeof payloadValue === 'number' &&
               typeof condition.value === 'number' &&
               payloadValue >= condition.value;

      case WorkflowConditionOperator.LESS_THAN_OR_EQUAL:
        return typeof payloadValue === 'number' &&
               typeof condition.value === 'number' &&
               payloadValue <= condition.value;

      case WorkflowConditionOperator.CONTAINS:
        if (typeof payloadValue === 'string' && typeof condition.value === 'string') {
          return payloadValue.toLowerCase().includes(condition.value.toLowerCase());
        }
        if (Array.isArray(payloadValue)) {
          return payloadValue.includes(condition.value);
        }
        return false;

      case WorkflowConditionOperator.NOT_CONTAINS:
        if (typeof payloadValue === 'string' && typeof condition.value === 'string') {
          return !payloadValue.toLowerCase().includes(condition.value.toLowerCase());
        }
        if (Array.isArray(payloadValue)) {
          return !payloadValue.includes(condition.value);
        }
        return false;

      case WorkflowConditionOperator.BETWEEN:
        if (typeof payloadValue === 'number' && Array.isArray(condition.value) && condition.value.length === 2) {
          const [min, max] = condition.value as [number, number];
          return payloadValue >= min && payloadValue <= max;
        }
        return false;

      case WorkflowConditionOperator.IN:
        if (Array.isArray(condition.value)) {
          return condition.value.includes(payloadValue);
        }
        return false;

      case WorkflowConditionOperator.NOT_IN:
        if (Array.isArray(condition.value)) {
          return !condition.value.includes(payloadValue);
        }
        return false;

      default:
        this.logger.warn(`Unknown condition operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   * e.g., getNestedValue(obj, 'user.profile.name')
   */
  static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
}
