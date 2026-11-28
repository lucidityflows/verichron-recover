import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when import processing fails after validation.
 *
 * HTTP Status: 500 Internal Server Error
 * Error Code: DEBTS_IMPORTS_004
 *
 * This indicates a system error during database operations, not a user error.
 * Transaction will be rolled back to ensure no partial imports.
 *
 * Common scenarios:
 * - Database connection failure
 * - Transaction deadlock
 * - Disk space issues
 * - Memory exhaustion
 */
export class ImportProcessingFailedException extends BaseException {
  constructor(reason: string, importJobId: string) {
    super(
      `Import processing failed for job '${importJobId}'. ${reason}. Transaction has been rolled back.`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DEBTS_IMPORTS_004',
    );
  }
}
