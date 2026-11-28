import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/role.decorator';

/**
 * RoleGuard checks if the user has required organization-level roles
 * Must be used after OrgContextGuard which populates request.activeContext
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip public endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get active context from request (set by OrgContextGuard)
    const { activeContext } = context.switchToHttp().getRequest();

    // If roles are required but no active context, deny access
    if (!activeContext || !activeContext.roles || activeContext.roles.length === 0) {
      throw new ForbiddenException(
        'Organization context required. Include x-org-id header.',
      );
    }

    // Check if user has at least one of the required roles
    const hasRequiredRole = requiredRoles.some(role =>
      activeContext.roles.includes(role),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
