import { SetMetadata } from '@nestjs/common';
import { OrganizationRole, PlatformRole } from '@verichron/enums';

/**
 * Metadata key for required roles
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required organization roles for an endpoint
 * Used in conjunction with RoleGuard
 *
 * @example
 * ```typescript
 * @Roles(OrganizationRole.ORG_ADMIN, OrganizationRole.ORG_MANAGER)
 * @Post(':id/transfer')
 * async transferPortfolio(...) { }
 * ```
 */
export const Roles = (...roles: (OrganizationRole | string)[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorator to specify required platform roles (cross-organization)
 * Used for platform-level operations like onboarding
 *
 * @example
 * ```typescript
 * @PlatformRoles(PlatformRole.PLATFORM_ADMIN)
 * @Post('/onboarding')
 * async provisionOrganization(...) { }
 * ```
 */
export const PlatformRoles = (...roles: (PlatformRole | string)[]) => SetMetadata('platformRoles', roles);
