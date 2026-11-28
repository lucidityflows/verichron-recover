import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class UserAlreadyExistsException extends BaseException {
  constructor(email: string) {
    super(
      `User with email '${email}' already exists.`,
      HttpStatus.CONFLICT,
      'USERS_PROFILE_002',
    );
  }
}