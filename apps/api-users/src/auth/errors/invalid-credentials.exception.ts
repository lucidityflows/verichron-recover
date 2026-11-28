import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class InvalidCredentialsException extends BaseException {
  constructor() {
    super(
      'Invalid email or password.',
      HttpStatus.UNAUTHORIZED,
      'USERS_AUTH_001',
    );
  }
}
