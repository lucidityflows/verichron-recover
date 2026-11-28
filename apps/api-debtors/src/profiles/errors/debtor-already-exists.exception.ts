// debtor-already-exists.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to create a debtor that already exists
 * Error Code: DEBTORS_PROFILE_002
 */
export class DebtorAlreadyExistsException extends BaseException {
  constructor(identifier: string) {
    super(
      `Debtor with identifier '${identifier}' already exists in the system.`,
      HttpStatus.CONFLICT,
      'DEBTORS_PROFILE_002'
    );
  }
}

