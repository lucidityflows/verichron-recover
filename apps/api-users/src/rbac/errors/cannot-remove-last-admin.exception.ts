// src/rbac/errors/cannot-remove-last-admin.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class CannotRemoveLastAdminException extends BaseException {
  constructor() {
    super(
      'Cannot remove the last Organization Admin role. At least one admin must remain in the organization.',
      HttpStatus.BAD_REQUEST,
      'USERS_RBAC_005',
    );
  }
}