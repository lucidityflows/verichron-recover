// debtor-not-found.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a requested debtor profile is not found
 * Error Code: DEBTORS_PROFILE_001
 */
export class DebtorNotFoundException extends BaseException {
  constructor(debtorId: string) {
    super(
      `Debtor with ID '${debtorId}' not found.`,
      HttpStatus.NOT_FOUND,
      'DEBTORS_PROFILE_001'
    );
  }
}

