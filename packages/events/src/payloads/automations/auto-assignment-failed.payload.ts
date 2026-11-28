/**
 * Payload for AUTOMATIONS.AUTO_ASSIGNMENT_FAILED event
 * Published by: api-automations
 * Consumed by: api-workflows (for tracking)
 */
export interface AutoAssignmentFailedPayload {
  organizationId: string;
  configId: string;
  targetEntityId?: string;
  error: string;
  correlationId?: string;
}
