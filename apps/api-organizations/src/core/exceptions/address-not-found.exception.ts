import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when an organization address is not found
 */
export class AddressNotFoundException extends BaseException {
  constructor(addressId?: string) {
    const message = addressId
      ? `Address with ID '${addressId}' not found.`
      : 'Address not found';
    super(message, HttpStatus.NOT_FOUND, 'ORGS_PROFILE_003');
  }
}
