import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class SystemRoleDeletionForbiddenException extends BaseException {
  constructor(roleId: string) {
    super(
      `System role with ID '${roleId}' cannot be deleted.`,
      HttpStatus.FORBIDDEN,
      'USERS_RBAC_002',
    );
  }
}