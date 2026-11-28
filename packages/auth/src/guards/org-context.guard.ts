import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  CustomJWTClaims,
  JWT_CLAIMS_NAMESPACE,
  JWTPayload,
  PlatformUserContext,
  OrganizationUserContext,
  DebtorUserContext,
} from '@verichron/contracts';
import { SKIP_ORG_CONTEXT_KEY, IS_PUBLIC_KEY } from '../decorators';
import { UserType } from '@verichron/enums';

/**
 * Organization Context Guard
 *
 * Validates that users can only access resources within their organization.
 * Platform admins (NULL org) can access any organization.
 *
 * Sets request.activeContext for downstream guards and services.
 *
 * SECURITY POLICY (Maximum Security - Zero Information Leakage):
 * - 401 Unauthorized: Missing/invalid JWT or malformed token
 * - 404 Not Found: Org context mismatch (NEVER reveal if org exists)
 * - Logs security violations for audit trail
 * - Never exposes whether a resource/org exists to unauthorized users
 */
@Injectable()
export class OrgContextGuard implements CanActivate {
  private readonly logger = new Logger(OrgContextGuard.name);

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

    // Check if this route skips org context validation
    const skipOrgContext = this.reflector.getAllAndOverride<boolean>(
      SKIP_ORG_CONTEXT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipOrgContext) {
      this.logger.debug('Skipping org context validation for this endpoint');
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Check for service-to-service authentication (HMAC-based)
    // Service accounts are set by JwtAuthGuard after successful HMAC verification
    if (request.serviceAccount) {
      this.logger.debug(
        `Service account access granted: ${request.serviceAccount.name}`
      );

      // Extract organization ID from route params for service calls
      // Internal endpoints typically use: /internal/*/.../:organizationId
      const orgId = request.params?.organizationId || request.params?.orgId;
      if (orgId) {
        request.organizationId = orgId;
      }

      // Service accounts are trusted - no further validation needed
      return true;
    }

    const user: JWTPayload | undefined = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const claims = user[JWT_CLAIMS_NAMESPACE];
    if (!claims) {
      throw new UnauthorizedException('Invalid token: missing claims');
    }

    // Platform users can bypass organization checks.
    // Set activeContext with platform roles so PermissionsGuard can validate platform permissions.
    if (user.userType === UserType.PLATFORM_USER) {
      this.logger.debug(`Platform user access granted for user: ${user.sub}`);

      // Populate activeContext for platform users
      const platformContext: PlatformUserContext = {
        type: 'PLATFORM_USER',
        orgId: null, // Platform users are not org-scoped
        roles: claims.platformRoles || [],
        permissions: claims.platformPermissions || [], // Platform permissions from token
      };
      request.activeContext = platformContext;

      return true;
    }

    // Debtor users can access their own data across multiple organizations
    if (user.userType === UserType.DEBTOR_USER) {
      this.logger.debug(`Debtor user access granted for user: ${user.sub}`);

      // Populate activeContext for debtor users
      const debtorContext: DebtorUserContext = {
        type: 'DEBTOR_USER',
        userId: user.sub,
        organizationIds: claims.organizationIds || [],
        permissions: claims.debtorPermissions || [],
      };
      request.activeContext = debtorContext;

      return true;
    }

    // For regular users, extract the organization ID from the token.
    const userOrgId = claims.organizationId;
    if (!userOrgId) {
      this.logger.error(`Non-platform user missing organizationId in token`, { userId: user.sub });
      throw new UnauthorizedException('Invalid token: User is missing organization context.');
    }

    // Extract the requested organization ID from multiple sources
    // Priority: header > route params > body
    const requestedOrgId =
      request.headers['x-org-id'] ||
      request.params?.orgId ||
      request.params?.organizationId ||
      request.body?.organizationId;

    // If no org specified in request, the user is operating within their own context.
    // We attach their orgId to the request for downstream services.
    if (!requestedOrgId) {
      request.organizationId = userOrgId;

      // Populate activeContext for org users
      const orgContext: OrganizationUserContext = {
        type: 'ORG_USER',
        orgId: userOrgId,
        roles: claims.roles || [],
        permissions: claims.permissions || [],
      };
      request.activeContext = orgContext;

      return true;
    }

    // If a header IS present, verify it matches the user's token.
    if (userOrgId !== requestedOrgId) {
      this.logger.warn(`Organization access violation attempt`, {
        userId: user.sub,
        userOrgId,
        requestedOrgId,
        path: request.url,
      });
      throw new ForbiddenException('You do not have access to this organization.');
    }

    // Attach the validated orgId to the request.
    request.organizationId = requestedOrgId;

    // Populate activeContext for org users with specified org
    const orgContext: OrganizationUserContext = {
      type: 'ORG_USER',
      orgId: requestedOrgId,
      roles: claims.roles || [],
      permissions: claims.permissions || [],
    };
    request.activeContext = orgContext;

    return true;
  }
}