

// invalid-document-type.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when an invalid file type is uploaded
 * Error Code: DEBTORS_DOCUMENT_003
 */
export class InvalidDocumentTypeException extends BaseException {
  constructor(mimeType: string, allowedTypes: string[]) {
    super(
      `Invalid document type '${mimeType}'. Allowed types: ${allowedTypes.join(', ')}.`,
      HttpStatus.BAD_REQUEST,
      'DEBTORS_DOCUMENT_003'
    );
  }
}