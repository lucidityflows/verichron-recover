import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a user attempts to access a resource but lacks the required permissions.
 *
 * SECURITY NOTE: Only throw this when the resource is WITHIN the user's organization scope.
 * If the resource is outside their scope, throw NotFoundException instead to prevent
 * information disclosure about resource existence.
 *
 * HTTP Status: 403 Forbidden (authentication succeeded, but lacks specific permission)
 */
export class MissingPermissionsException extends BaseException {
  constructor(missingPermissions: string[]) {
    const permissionList = missingPermissions.join(', ');
    super(
      `Insufficient permissions. Missing: ${permissionList}`,
      HttpStatus.FORBIDDEN,
      'AUTH_PERMISSIONS_001',
    );
  }
}
