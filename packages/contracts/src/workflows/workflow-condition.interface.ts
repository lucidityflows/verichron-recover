import { WorkflowConditionOperator } from '@verichron/enums';

export interface WorkflowCondition {
  field: string; // e.g., 'balance', 'accountAge', 'brokenPromises'
  operator: WorkflowConditionOperator; // e.g., EQUALS, GREATER_THAN
  value: string | number | boolean | [number, number]; // Value to compare against
}
