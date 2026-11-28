// src/profiles/errors/invitation-expired.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class InvitationExpiredException extends BaseException {
  constructor() {
    super(
      'Invitation token has expired. Please request a new invitation.',
      HttpStatus.BAD_REQUEST,
      'USERS_PROFILE_004',
    );
  }
}