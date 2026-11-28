// document-not-found.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a requested document is not found
 * Error Code: DEBTORS_DOCUMENT_001
 */
export class DocumentNotFoundException extends BaseException {
  constructor(documentId: string) {
    super(
      `Document with ID '${documentId}' not found.`,
      HttpStatus.NOT_FOUND,
      'DEBTORS_DOCUMENT_001'
    );
  }
}