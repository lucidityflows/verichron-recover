import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class InvalidResetTokenException extends BaseException {
  constructor() {
    super(
      'Invalid or expired password reset token.',
      HttpStatus.BAD_REQUEST,
      'USERS_AUTH_002',
    );
  }
}
