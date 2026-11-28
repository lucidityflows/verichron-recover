import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a requested import job cannot be found.
 *
 * HTTP Status: 404 Not Found
 * Error Code: DEBTS_IMPORTS_001
 *
 * Common scenarios:
 * - Import job ID does not exist in the database
 * - User attempts to access an import job from a different organization
 */
export class ImportJobNotFoundException extends BaseException {
  constructor(importJobId: string) {
    super(
      `Import job with ID '${importJobId}' not found or you do not have access to it.`,
      HttpStatus.NOT_FOUND,
      'DEBTS_IMPORTS_001',
    );
  }
}
