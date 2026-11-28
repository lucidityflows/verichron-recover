import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Document Not Found Exception
 * 
 * Thrown when a requested document does not exist or the user
 * does not have access to it.
 */
export class DocumentNotFoundException extends BaseException {
  constructor(documentId: string) {
    super(
      `Document with ID '${documentId}' not found or access denied.`,
      HttpStatus.NOT_FOUND,
      'TRANSACTIONS_DOCS_001',
    );
  }
}