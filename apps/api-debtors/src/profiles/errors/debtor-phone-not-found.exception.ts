// debtor-phone-not-found.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a requested debtor phone is not found
 * Error Code: DEBTORS_PROFILE_006
 */
export class DebtorPhoneNotFoundException extends BaseException {
  constructor(phoneId: string, debtorId: string) {
    super(
      `Phone with ID '${phoneId}' not found for debtor '${debtorId}'.`,
      HttpStatus.NOT_FOUND,
      'DEBTORS_PROFILE_006'
    );
  }
}

