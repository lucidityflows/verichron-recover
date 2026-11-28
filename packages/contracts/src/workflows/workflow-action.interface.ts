import { WorkflowActionType } from '@verichron/enums';

export interface WorkflowAction {
  id: string; // UUID for the action instance (can be auto-generated later if needed)
  type: WorkflowActionType; // e.g., ASSIGN_TO_COLLECTOR, SEND_EMAIL
  config: Record<string, any>; // Action-specific configuration (e.g., collectorId, templateId)
  order: number; // Execution order within the rule
}
