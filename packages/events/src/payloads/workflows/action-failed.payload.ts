/**
 * Payload for WorkflowActionFailed event
 * Published by api-automations when a workflow command execution fails
 */
export interface WorkflowActionFailedPayload {
  organizationId: string;

  /** ID of the workflow rule that triggered this action */
  ruleId: string;

  /** Name of the workflow rule */
  ruleName: string;

  /** Type of action that failed (e.g., 'SEND_EMAIL', 'ASSIGN_TO_COLLECTOR') */
  actionType: string;

  /** ID of the target entity (e.g., debt ID) */
  targetEntityId: string;

  /** Type of the target entity */
  targetEntityType: string;

  /** Error message */
  error: string;

  /** Duration of the failed attempt in milliseconds */
  durationMs?: number;

  /** Correlation ID for tracking */
  correlationId?: string;
}
