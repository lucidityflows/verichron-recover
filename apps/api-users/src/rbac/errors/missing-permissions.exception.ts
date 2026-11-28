import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a user attempts to access a resource but lacks the required permissions.
 *
 * This is used by PermissionsGuard when JWT authentication succeeds but the user doesn't have
 * the necessary permissions for the requested action.
 *
 * HTTP Status: 403 Forbidden (not 401 Unauthorized - authentication succeeded, authorization failed)
 */
export class MissingPermissionsException extends BaseException {
  constructor(missingPermissions: string[]) {
    const permissionList = missingPermissions.join(', ');
    super(
      `Insufficient permissions. Missing: ${permissionList}`,
      HttpStatus.FORBIDDEN,
      'USERS_RBAC_005',
    );
  }
}
