// src/profiles/errors/invalid-invitation-token.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class InvalidInvitationTokenException extends BaseException {
  constructor() {
    super(
      'Invalid invitation token. Please request a new invitation.',
      HttpStatus.BAD_REQUEST,
      'USERS_PROFILE_003',
    );
  }
}