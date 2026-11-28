/**
 * Payload for DocumentDeleted event
 * Published by api-debtors when a document is soft-deleted
 */
export interface DocumentDeletedPayload {
  /** Unique document identifier */
  documentId: string;

  /** Unique debtor identifier */
  debtorId: string;

  /** Organization context */
  organizationId: string;

  /** Timestamp when document was deleted */
  deletedAt: string;

  /** User who deleted the document */
  deletedBy: string;

  /** Reason for deletion (optional) */
  reason?: string;
}
