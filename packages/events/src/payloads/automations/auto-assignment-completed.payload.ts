/**
 * Payload for AUTOMATIONS.AUTO_ASSIGNMENT_COMPLETED event
 * Published by: api-automations
 * Consumed by: api-workflows (for tracking), analytics
 */
export interface AutoAssignmentCompletedPayload {
  organizationId: string;
  configId: string;
  success: boolean;
  collectorId?: string;
  targetEntityId: string;
  reason?: string;
  error?: string;
  correlationId?: string;
}
