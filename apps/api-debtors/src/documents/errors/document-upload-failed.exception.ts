// document-upload-failed.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when document upload to GCS fails
 * Error Code: DEBTORS_DOCUMENT_004
 */
export class DocumentUploadFailedException extends BaseException {
  constructor(filename: string, reason?: string) {
    super(
      `Failed to upload document '${filename}' to storage.${reason ? ` Reason: ${reason}` : ''}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DEBTORS_DOCUMENT_004'
    );
  }
}