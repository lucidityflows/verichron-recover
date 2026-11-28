/**
 * Payload for DemographicsUpdated event
 * Published by api-debtors when a debtor demographics record is modified
 */
export interface DemographicsUpdatedPayload {
  /** Unique demographics record identifier */
  demographicsId: string;
  /** Unique debtor identifier */
  debtorId: string;
  /** Organization context for the update */
  organizationId: string;
  /** Timestamp when demographics record was updated */
  updatedAt: string;
  /** Fields that were updated */
  updatedFields: string[];
}

