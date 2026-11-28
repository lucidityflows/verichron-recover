// debtor-address-not-found.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a requested debtor address is not found
 * Error Code: DEBTORS_PROFILE_004
 */
export class DebtorAddressNotFoundException extends BaseException {
  constructor(addressId: string, debtorId: string) {
    super(
      `Address with ID '${addressId}' not found for debtor '${debtorId}'.`,
      HttpStatus.NOT_FOUND,
      'DEBTORS_PROFILE_004'
    );
  }
}

