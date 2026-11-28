import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class PermissionNotFoundException extends BaseException {
  constructor(permissionId: string) {
    super(
      `Permission with ID '${permissionId}' not found.`,
      HttpStatus.NOT_FOUND,
      'USERS_RBAC_002',
    );
  }
}
