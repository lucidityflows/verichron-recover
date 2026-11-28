// src/profiles/errors/address-not-found.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class AddressNotFoundException extends BaseException {
  constructor(addressId: string) {
    super(
      `Address with ID '${addressId}' not found.`,
      HttpStatus.NOT_FOUND,
      'USERS_PROFILE_005',
    );
  }
}