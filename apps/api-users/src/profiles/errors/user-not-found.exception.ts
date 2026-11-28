import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class UserNotFoundException extends BaseException {
  constructor(identifier: string) {
    super(
      `User with identifier '${identifier}' not found.`,
      HttpStatus.NOT_FOUND,
      'USERS_PROFILE_001',
    );
  }
}