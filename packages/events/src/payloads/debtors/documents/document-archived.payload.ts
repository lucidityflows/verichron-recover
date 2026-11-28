/**
 * Payload for DocumentArchived event
 * Published by api-debtors when a document is archived
 */
export interface DocumentArchivedPayload {
  /** Unique document identifier */
  documentId: string;

  /** Unique debtor identifier */
  debtorId: string;

  /** Organization context */
  organizationId: string;

  /** Timestamp when document was archived */
  archivedAt: string;

  /** User who archived the document */
  archivedBy: string;

  /** Reason for archiving (optional) */
  reason?: string;
}
