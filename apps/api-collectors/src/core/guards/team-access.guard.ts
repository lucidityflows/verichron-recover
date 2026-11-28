import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@verichron/auth';
import { TeamsClientService } from '../services/teams-client.service';
import { JWTPayload, JWT_CLAIMS_NAMESPACE } from '@verichron/contracts';
import { UserType, OrganizationRole } from '@verichron/enums';

/**
 * Team Access Guard
 *
 * Validates access to team-scoped resources based on ?teamId query parameter.
 * Enforces strict team membership validation.
 *
 * PREREQUISITES:
 * - Must run AFTER OrgContextGuard (assumes request.organizationId is set)
 * - Must run AFTER JwtAuthGuard (assumes request.user is set)
 *
 * BEHAVIOR:
 * 1. If no ?teamId parameter: Allow (org-wide access for admins/managers)
 * 2. If ?teamId provided:
 *    a. Verify team belongs to user's organization
 *    b. Organization admins/managers can access all teams
 *    c. Team leads/collectors must be members of the requested team
 */
@Injectable()
export class TeamAccessGuard implements CanActivate {
  private readonly logger = new Logger(TeamAccessGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly teamsClient: TeamsClientService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip for public endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Skip for service-to-service calls (trusted)
    if (request.serviceAccount) {
      this.logger.debug('Service account access - skipping team validation');
      return true;
    }

    const user: JWTPayload | undefined = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Platform admins bypass all checks
    if (user.userType === UserType.PLATFORM_USER) {
      this.logger.debug('Platform admin access - skipping team validation');
      return true;
    }

    // Extract teamId from query parameters
    const teamId = request.query?.teamId;

    // If no teamId, allow org-wide access (will be restricted by role permissions)
    if (!teamId) {
      this.logger.debug('No teamId parameter - allowing org-wide access');
      return true;
    }

    // Get organization ID (should be set by OrgContextGuard)
    const organizationId = request.organizationId;
    if (!organizationId) {
      this.logger.error('TeamAccessGuard called without organizationId set');
      throw new ForbiddenException('Organization context not set');
    }

    this.logger.debug(
      `Validating team access: teamId=${teamId}, orgId=${organizationId}, userId=${user.sub}`,
    );

    // Step 1: Verify team belongs to organization
    const teamBelongsToOrg = await this.teamsClient.verifyTeamBelongsToOrg(
      teamId,
      organizationId,
    );

    if (!teamBelongsToOrg) {
      this.logger.warn(
        `Team ${teamId} does not belong to organization ${organizationId}`,
      );
      throw new ForbiddenException('Team not found in this organization');
    }

    // Step 2: Check user roles
    const claims = user[JWT_CLAIMS_NAMESPACE];
    const roles = claims?.roles || [];

    // Organization admins and managers can access all teams
    const isOrgAdmin = roles.some(role =>
      role === OrganizationRole.ORG_ADMIN ||
      role === OrganizationRole.ORG_MANAGER ||
      role.toLowerCase().includes('admin') ||
      role.toLowerCase().includes('manager')
    );

    if (isOrgAdmin) {
      this.logger.debug(
        `Org admin/manager access granted: userId=${user.sub}, teamId=${teamId}`,
      );
      request.teamId = teamId;
      return true;
    }

    // Step 3: For team leads and collectors, verify team membership
    const isTeamMember = await this.teamsClient.verifyUserIsTeamMember(
      user.sub,
      teamId,
    );

    if (!isTeamMember) {
      this.logger.warn(
        `User ${user.sub} attempted to access team ${teamId} but is not a member`,
      );
      throw new ForbiddenException('You do not have access to this team');
    }

    this.logger.debug(
      `Team member access granted: teamId=${teamId}, userId=${user.sub}`,
    );

    // Attach teamId to request for downstream use
    request.teamId = teamId;

    return true;
  }
}
