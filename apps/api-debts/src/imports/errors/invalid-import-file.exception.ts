import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when uploaded file is invalid or corrupt.
 *
 * HTTP Status: 400 Bad Request
 * Error Code: DEBTS_IMPORTS_002
 *
 * Common scenarios:
 * - File is not a valid CSV
 * - File is empty
 * - File encoding is not supported
 * - File is corrupted
 * - Required columns are missing
 */
export class InvalidImportFileException extends BaseException {
  constructor(reason: string) {
    super(`Invalid import file. ${reason}`, HttpStatus.BAD_REQUEST, 'DEBTS_IMPORTS_002');
  }
}
