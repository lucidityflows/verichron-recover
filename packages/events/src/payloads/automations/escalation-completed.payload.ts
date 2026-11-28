/**
 * Payload for AUTOMATIONS.ESCALATION_COMPLETED event
 * Published by: api-automations
 * Consumed by: api-workflows (for tracking), analytics
 */
export interface EscalationCompletedPayload {
  organizationId: string;
  ruleId: string;
  ruleName: string;
  targetEntityId: string;
  targetEntityType: string;
  escalatedTo: string;
  escalationTargets: string[];
  priority: string;
  notificationsSent: string[];
  correlationId?: string;
}
