import { EVENT_TYPES } from "@verichron/events";

// src/events/event-dto/constants.ts

/**
 * EVENT NAMING CONVENTION GUIDE
 * ==============================
 *
 * Use semantic verb distinctions to indicate event significance:
 *
 * **"changed"** - Lifecycle/state transitions (requires workflow logic):
 *   - Status/state transitions: status_changed, suspended, reactivated, activated
 *   - Identity changes: name_changed (key identifiers)
 *   - Relationship changes: parent_changed, owner_changed
 *   - Permission changes: permissions_changed, role_assigned
 *
 * **"updated"** - Property/data modifications (simpler data sync):
 *   - Property modifications: settings_updated, profile_updated
 *   - General field updates: organization_updated, user_updated (catch-all)
 *   - Configuration changes: preferences_updated, configuration_updated
 *
 * **Specific action verbs** - Explicit lifecycle events:
 *   - created, deleted, assigned, unassigned, issued, requested, completed, failed
 *
 * Examples:
 *   ✓ user.status_changed        (lifecycle transition)
 *   ✓ user.profile_updated        (data modification)
 *   ✓ user.created                (lifecycle event)
 *   ✓ organization.name_changed   (identity change)
 *   ✓ organization.updated        (general property updates)
 */

/**
 * Mapping of event types to their corresponding DTO classes.
 * Useful for type-safe event handling and deserialization.
 */
import { OrganizationCreatedDto } from './organizations/organization-created.dto';
import { PasswordResetRequestedDto } from './auth/password-reset-requested.dto';
import { ContextSwitchedDto } from './auth/context-switched.dto';
import { TokenIssuedDto } from './auth/token-issued.dto';
import { LoginFailedDto } from './auth/login-failed.dto';
import { LoginSuccessDto } from './auth/login-success.dto';
import { UserDeletedDto } from './users/user-deleted.dto';
import { UserStatusChangedDto } from './users/user-status-changed.dto';
import { UserProfileUpdatedDto } from './users/user-profile-updated.dto';
import { UserActivatedDto } from './users/user-activated.dto';
import { UserCreatedDto } from './users/user-created.dto';
import { DebtorUserCreatedDto } from './users/debtor-user-created.dto';

import { OrganizationUpdatedDto } from './organizations/organization-updated.dto';
import { OrganizationNameChangedDto } from './organizations/organization-name-changed.dto';
import { OrganizationStatusChangedDto } from './organizations/organization-status-changed.dto';
import { OrganizationSuspendedDto } from './organizations/organization-suspended.dto';
import { OrganizationReactivatedDto } from './organizations/organization-reactivated.dto';
import { RoleCreatedDto } from './roles/role-created.dto';
import { RoleUpdatedDto } from './roles/role-updated.dto';
import { RoleDeletedDto } from './roles/role-deleted.dto';
import { RoleAssignedDto } from './roles/role-assigned.dto';
import { RoleUnassignedDto } from './roles/role-unassigned.dto';
import { PermissionsChangedDto } from './roles/permissions-changed.dto';

export const EVENT_DTO_MAP = {
  [EVENT_TYPES.USERS_USER_CREATED]: UserCreatedDto,
  [EVENT_TYPES.USERS_USER_ACTIVATED]: UserActivatedDto,
  [EVENT_TYPES.USERS_USER_PROFILE_UPDATED]: UserProfileUpdatedDto,
  [EVENT_TYPES.USERS_USER_STATUS_CHANGED]: UserStatusChangedDto,
  [EVENT_TYPES.USERS_USER_DELETED]: UserDeletedDto,
  [EVENT_TYPES.USERS_DEBTOR_USER_CREATED]: DebtorUserCreatedDto,
  [EVENT_TYPES.USERS_AUTH_LOGIN_SUCCESS]: LoginSuccessDto,
  [EVENT_TYPES.USERS_AUTH_LOGIN_FAILED]: LoginFailedDto,
  [EVENT_TYPES.USERS_AUTH_TOKEN_ISSUED]: TokenIssuedDto,
  [EVENT_TYPES.USERS_AUTH_CONTEXT_SWITCHED]: ContextSwitchedDto,
  [EVENT_TYPES.USERS_AUTH_PASSWORD_RESET_REQUESTED]: PasswordResetRequestedDto,
  [EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED]: OrganizationCreatedDto,
  [EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_UPDATED]: OrganizationUpdatedDto,
  [EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_NAME_CHANGED]: OrganizationNameChangedDto,
  [EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_STATUS_CHANGED]: OrganizationStatusChangedDto,
  [EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SUSPENDED]: OrganizationSuspendedDto,
  [EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_REACTIVATED]: OrganizationReactivatedDto,
  [EVENT_TYPES.USERS_ROLE_CREATED]: RoleCreatedDto,
  [EVENT_TYPES.USERS_ROLE_UPDATED]: RoleUpdatedDto,
  [EVENT_TYPES.USERS_ROLE_DELETED]: RoleDeletedDto,
  [EVENT_TYPES.USERS_ROLE_ASSIGNED]: RoleAssignedDto,
  [EVENT_TYPES.USERS_ROLE_UNASSIGNED]: RoleUnassignedDto,
  [EVENT_TYPES.USERS_PERMISSIONS_CHANGED]: PermissionsChangedDto,
} as const;
