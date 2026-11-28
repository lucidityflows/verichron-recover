/**
 * Payload for WorkflowActionSkipped event
 * Published by api-automations when a workflow command is skipped due to stop-work logic
 * (e.g., debt status is PAID_IN_FULL, so email should not be sent)
 */
export interface WorkflowActionSkippedPayload {
  organizationId: string;

  /** ID of the workflow rule that triggered this action */
  ruleId: string;

  /** Name of the workflow rule */
  ruleName: string;

  /** Type of action that was skipped (e.g., 'SEND_EMAIL', 'ASSIGN_TO_COLLECTOR') */
  actionType: string;

  /** ID of the target entity (e.g., debt ID) */
  targetEntityId: string;

  /** Type of the target entity */
  targetEntityType: string;

  /** Reason why the action was skipped */
  skipReason: string;

  /** Correlation ID for tracking */
  correlationId?: string;
}
