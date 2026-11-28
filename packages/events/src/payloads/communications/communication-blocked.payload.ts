/**
 * Communication Blocked Event Payload
 *
 * Published when the internal ComplianceService prevents a dispatch from occurring.
 * Creates an explicit audit trail of compliance-related blocks, crucial for regulatory reviews.
 *
 * Consumers: api-collectors (compliance tracking), analytics systems, audit logs
 */
export interface CommunicationBlockedPayload {
  /**
   * UUID of the communication log entry
   */
  logId: string;

  /**
   * UUID of the organization
   */
  organizationId: string;

  /**
   * UUID of the debtor
   */
  debtorId: string;

  /**
   * Timestamp when blocked (ISO 8601)
   */
  blockedAt: string;

  /**
   * Human-readable blocking reason
   */
  reason: string;

  /**
   * Name of the compliance rule that triggered the block
   * (e.g., "TimeOfDayRule", "DoNotContactRule", "FrequencyLimitRule")
   */
  ruleName: string;
}
