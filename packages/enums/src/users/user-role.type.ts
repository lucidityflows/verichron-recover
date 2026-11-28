import { PlatformRole } from '../platform/platform-role.enum';
import { OrganizationRole } from '../organizations/organization-role.enum';

/**
 * Union type for all system roles
 */
export type UserRole = PlatformRole | OrganizationRole;
