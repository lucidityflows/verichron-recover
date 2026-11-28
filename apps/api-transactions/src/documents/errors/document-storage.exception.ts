import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';


/**
 * Document Storage Exception
 * 
 * Thrown when uploading or retrieving documents from Google Cloud Storage fails.
 */
export class DocumentStorageException extends BaseException {
  constructor(operation: string, reason: string) {
    super(
      `Document storage ${operation} failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'TRANSACTIONS_DOCS_003',
    );
  }
}