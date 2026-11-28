/**
 * Payload for AUTOMATIONS.ESCALATION_FAILED event
 * Published by: api-automations
 * Consumed by: api-workflows (for tracking), analytics
 */
export interface EscalationFailedPayload {
  organizationId: string;
  ruleId: string;
  ruleName?: string;
  targetEntityId: string;
  reason?: string;
  error?: string;
  notificationsSent: string[];
  correlationId?: string;
}
