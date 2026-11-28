import { DebtorDocumentType } from '@verichron/enums';

/**
 * Payload for DocumentUploaded event
 * Published by api-debtors when a new document is uploaded
 */
export interface DocumentUploadedPayload {
  /** Unique document identifier */
  documentId: string;

  /** Unique debtor identifier */
  debtorId: string;

  /** Organization context */
  organizationId: string;

  /** Type of document uploaded */
  documentType: DebtorDocumentType;

  /** Original filename */
  filename: string;

  /** File size in bytes */
  fileSize: number;

  /** MIME type */
  mimeType: string;

  /** Timestamp when document was uploaded */
  uploadedAt: string;

  /** User who uploaded the document */
  uploadedBy: string;
}
