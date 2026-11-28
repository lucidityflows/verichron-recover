

import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Document Generation Failed Exception
 * 
 * Thrown when PDF generation fails due to template errors,
 * missing data, or other generation issues.
 */
export class DocumentGenerationFailedException extends BaseException {
  constructor(documentType: string, reason: string) {
    super(
      `Failed to generate ${documentType} document: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'TRANSACTIONS_DOCS_002',
    );
  }
}