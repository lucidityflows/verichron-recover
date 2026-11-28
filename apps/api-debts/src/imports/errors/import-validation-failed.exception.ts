import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when CSV data validation fails.
 *
 * HTTP Status: 422 Unprocessable Entity
 * Error Code: DEBTS_IMPORTS_003
 *
 * Contains detailed validation errors for each row that failed validation.
 * This allows the user to fix all issues at once rather than one at a time.
 *
 * Example error format:
 * "Validation failed:
 *  Row 5: principalAmount must be greater than 0
 *  Row 12: originalDebtDate is required
 *  Row 18: accountNumber already exists"
 */
export class ImportValidationFailedException extends BaseException {
  constructor(validationErrors: string[]) {
    const errorMessage = [
      'Import validation failed. Please fix the following issues:',
      ...validationErrors.map((err, idx) => `  ${idx + 1}. ${err}`),
    ].join('\n');

    super(errorMessage, HttpStatus.UNPROCESSABLE_ENTITY, 'DEBTS_IMPORTS_003');
  }
}
