/**
 * Payload for WorkflowActionCompleted event
 * Published by api-automations after successfully executing a workflow command
 */
export interface WorkflowActionCompletedPayload {
  organizationId: string;

  /** ID of the workflow rule that triggered this action */
  ruleId: string;

  /** Name of the workflow rule */
  ruleName: string;

  /** Type of action executed (e.g., 'SEND_EMAIL', 'ASSIGN_TO_COLLECTOR') */
  actionType: string;

  /** ID of the target entity (e.g., debt ID) */
  targetEntityId: string;

  /** Type of the target entity */
  targetEntityType: string;

  /** Result of the action execution */
  result?: string;

  /** Duration of the action in milliseconds */
  durationMs?: number;

  /** Correlation ID for tracking */
  correlationId?: string;
}
