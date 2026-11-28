import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class InsufficientPermissionsException extends BaseException {
  constructor(resource: string) {
    super(
      `You do not have permission to modify this ${resource}.`,
      HttpStatus.FORBIDDEN,
      'USERS_RBAC_004',
    );
  }
}
