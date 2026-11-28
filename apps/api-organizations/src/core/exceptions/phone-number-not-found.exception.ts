import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when an organization phone number is not found
 */
export class PhoneNumberNotFoundException extends BaseException {
  constructor(phoneNumberId?: string) {
    const message = phoneNumberId
      ? `Phone number with ID '${phoneNumberId}' not found.`
      : 'Phone number not found';
    super(message, HttpStatus.NOT_FOUND, 'ORGS_PROFILE_005');
  }
}
