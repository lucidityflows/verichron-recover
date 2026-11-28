// duplicate-phone.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to add a duplicate phone number to a debtor
 * Error Code: DEBTORS_PROFILE_008
 */
export class DuplicatePhoneException extends BaseException {
  constructor(phoneNumber: string, debtorId: string) {
    super(
      `Phone number '${phoneNumber}' is already associated with debtor '${debtorId}'.`,
      HttpStatus.CONFLICT,
      'DEBTORS_PROFILE_008'
    );
  }
}