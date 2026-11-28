// duplicate-email.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to add a duplicate email address to a debtor
 * Error Code: DEBTORS_PROFILE_007
 */
export class DuplicateEmailException extends BaseException {
  constructor(email: string, debtorId: string) {
    super(
      `Email '${email}' is already associated with debtor '${debtorId}'.`,
      HttpStatus.CONFLICT,
      'DEBTORS_PROFILE_007'
    );
  }
}

