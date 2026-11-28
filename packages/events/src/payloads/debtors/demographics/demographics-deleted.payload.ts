/**
 * Payload for DemographicsDeleted event
 * Published by api-debtors when a debtor demographics record is soft-deleted
 */
export interface DemographicsDeletedPayload {
  /** Unique demographics record identifier */
  demographicsId: string;
  /** Unique debtor identifier */
  debtorId: string;
  /** Organization context for the deletion */
  organizationId: string;
  /** Timestamp when demographics record was soft-deleted */
  deletedAt: string;
}
