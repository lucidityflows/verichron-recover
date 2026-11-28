import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, IS_PUBLIC_KEY } from '../decorators';
import {
  JWT_CLAIMS_NAMESPACE
} from '@verichron/contracts';
import { MissingPermissionsException } from '../errors';
import { OrganizationPermission, PlatformPermission, UserType } from '@verichron/enums';

/**
 * Permissions Guard
 *
 * Validates that the authenticated user has required permissions.
 * Works for both platform admins (NULL org) and regular users.
 *
 * SECURITY NOTE: This guard only throws 403 Forbidden after OrgContextGuard
 * has validated the user is in the correct organization scope. If they are
 * accessing resources outside their org scope, OrgContextGuard will have
 * already thrown 404 Not Found to prevent information disclosure.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  // Logger is instantiated directly, not injected
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip public endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      this.logger.warn('Unauthenticated access attempt to protected resource', {
        path: request.url,
        ip: request.ip,
      });
      throw new UnauthorizedException('Authentication required to access this resource');
    }

    // Extract user permissions from JWT claims namespace
    const claims = user[JWT_CLAIMS_NAMESPACE];
    if (!claims) {
      this.logger.warn('Missing claims namespace in JWT', {
        userId: user.sub,
        path: request.url,
      });
      throw new UnauthorizedException('Invalid token: missing claims');
    }

    // Platform admins have platformPermissions, organization users have permissions
    const isPlatformAdmin = user.userType === UserType.PLATFORM_USER && claims.organizationId === null;
    const userPermissions = claims.permissions ?? [];
    const platformPermissions = claims.platformPermissions ?? [];

    // Platform admin permission mapping: platform:resource:action grants all resource:* permissions
    // Example: "platform:users:manage" grants "user:read", "user:create", "user:update", "user:delete"
    const hasPermission = requiredPermissions.some((permission) => {
      // Check organization-level permissions
      if (userPermissions.includes(permission)) {
        return true;
      }

      // For platform admins, check if they have the corresponding platform permission
      if (isPlatformAdmin) {
        // Direct match for platform permission
        if (platformPermissions.includes(permission)) {
          return true;
        }

        const [resource] = permission.split(':');
        // Check if platform admin has "platform:resources:manage" (handles plural vs singular)
        const platformManagePermission = `platform:${resource}s:manage`;
        return platformPermissions.includes(platformManagePermission);
      }

      return false;
    });

    if (!hasPermission) {
      this.logger.warn('Insufficient permissions', {
        userId: user.sub,
        userType: user.userType,
        organizationId: claims.organizationId,
        required: requiredPermissions,
        userPermissions: isPlatformAdmin ? platformPermissions : userPermissions,
        path: request.url,
      });

      throw new MissingPermissionsException(requiredPermissions);
    }

    return true;
  }
}