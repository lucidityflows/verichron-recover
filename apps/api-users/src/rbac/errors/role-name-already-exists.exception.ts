// src/rbac/errors/role-name-already-exists.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class RoleNameAlreadyExistsException extends BaseException {
  constructor(roleName: string) {
    super(
      `A role with the name '${roleName}' already exists in your organization.`,
      HttpStatus.CONFLICT,
      'USERS_RBAC_004',
    );
  }
}