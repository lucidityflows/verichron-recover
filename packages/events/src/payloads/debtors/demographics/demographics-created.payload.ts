/**
 * Payload for DemographicsCreated event
 * Published by api-debtors when a new debtor demographics record is created
 */
export interface DemographicsCreatedPayload {
  /** Unique demographics record identifier */
  demographicsId: string;
  /** Unique debtor identifier */
  debtorId: string;
  /** Organization that has access to this debtor's demographics */
  organizationId: string;
  /** Timestamp when demographics record was created */
  createdAt: string;
}

