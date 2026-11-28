import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class RoleNotFoundException extends BaseException {
  constructor(roleId: string) {
    super(
      `Role with ID '${roleId}' not found.`,
      HttpStatus.NOT_FOUND,
      'USERS_RBAC_001',
    );
  }
}

