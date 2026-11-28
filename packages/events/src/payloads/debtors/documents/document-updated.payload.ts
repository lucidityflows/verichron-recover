/**
 * Payload for DocumentUpdated event
 * Published by api-debtors when document metadata is updated
 */
export interface DocumentUpdatedPayload {
  /** Unique document identifier */
  documentId: string;

  /** Unique debtor identifier */
  debtorId: string;

  /** Organization context */
  organizationId: string;

  /** Timestamp when document was updated */
  updatedAt: string;

  /** User who updated the document */
  updatedBy: string;

  /** Fields that were updated */
  updatedFields: string[];
}
