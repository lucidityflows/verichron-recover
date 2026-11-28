// debtor-email-not-found.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a requested debtor email is not found
 * Error Code: DEBTORS_PROFILE_005
 */
export class DebtorEmailNotFoundException extends BaseException {
  constructor(emailId: string, debtorId: string) {
    super(
      `Email with ID '${emailId}' not found for debtor '${debtorId}'.`,
      HttpStatus.NOT_FOUND,
      'DEBTORS_PROFILE_005'
    );
  }
}

