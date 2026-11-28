import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when an organization email is not found
 */
export class EmailNotFoundException extends BaseException {
  constructor(emailId?: string) {
    const message = emailId
      ? `Email with ID '${emailId}' not found.`
      : 'Email not found';
    super(message, HttpStatus.NOT_FOUND, 'ORGS_PROFILE_004');
  }
}
