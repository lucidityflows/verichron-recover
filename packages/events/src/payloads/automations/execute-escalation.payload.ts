import { WorkflowCondition } from '@verichron/contracts';

/**
 * Payload for AUTOMATIONS.EXECUTE_ESCALATION command
 * Published by: api-workflows
 * Consumed by: api-automations
 */
export interface ExecuteEscalationPayload {
  organizationId: string;
  ruleId: string;
  ruleName: string;
  targetEntityId: string;
  targetEntityType: string;
  targetEntityData?: Record<string, any>;
  triggerConditions: WorkflowCondition[];
  escalateTo: string; // EscalationEscalateTo enum value
  escalationTargets: string[]; // User IDs
  notificationMethods: string[]; // EscalationNotificationMethod enum values
  priority: string; // WorkflowPriority enum value
  correlationId?: string;
}
