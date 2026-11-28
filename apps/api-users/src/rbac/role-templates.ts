/**
 * Role Templates
 *
 * These define the structure and permissions for system roles.
 * Templates are instantiated per-organization during onboarding or testing.
 *
 * IMPORTANT: These are TEMPLATES, not seeded roles.
 * - Platform roles are created once with organizationId = null
 * - Org roles are created per-organization during setup/onboarding
 */

import { DEFAULT_DEBTOR_PERMISSIONS, OrganizationPermission, PlatformPermission } from '@verichron/enums';

/**
 * Platform Role Template
 * Created once with organizationId = null
 */
export const PLATFORM_ADMIN_ROLE_TEMPLATE = {
  name: 'PLATFORM_ADMIN',
  description: 'Platform administrator with full system access across all organizations',
  isSystemRole: true,
  permissions: [
    PlatformPermission.ORGS_CREATE,
    PlatformPermission.ORGS_READ,
    PlatformPermission.ORGS_DELETE,
    PlatformPermission.ORGS_UPDATE,
    PlatformPermission.ORGS_SUSPEND,
    PlatformPermission.ORGS_MANAGE,
    PlatformPermission.USERS_MANAGE,
    PlatformPermission.USERS_IMPERSONATE,
    PlatformPermission.ROLES_MANAGE,
    PlatformPermission.SYSTEM_SETTINGS,
    PlatformPermission.AUDIT_VIEW,
    PlatformPermission.TEAMS_MANAGE,
  ],
} as const;

/**
 * Organization Role Templates
 * Instantiated for each organization with specific organizationId
 */
export const ORG_ROLE_TEMPLATES = {
  ORG_ADMIN: {
    name: 'ORG_ADMIN',
    description: 'Full control over the organization resources',
    isSystemRole: true,
    permissions: [
      OrganizationPermission.ORGS_READ,
      OrganizationPermission.ORGS_WRITE,
      OrganizationPermission.ORGS_DELETE,
      OrganizationPermission.ORGS_SETTINGS_READ,
      OrganizationPermission.ORGS_SETTINGS_WRITE,
      OrganizationPermission.USERS_READ,
      OrganizationPermission.USERS_WRITE,
      OrganizationPermission.USERS_DELETE,
      OrganizationPermission.USERS_ROLES_ASSIGN,
      OrganizationPermission.TEAMS_READ,
      OrganizationPermission.TEAMS_MANAGE,
      OrganizationPermission.DEBTS_READ,
      OrganizationPermission.DEBTS_WRITE,
      OrganizationPermission.DEBTS_DELETE,
      OrganizationPermission.DEBTS_NOTES_WRITE,
      OrganizationPermission.PORTFOLIOS_READ,
      OrganizationPermission.PORTFOLIOS_WRITE,
      OrganizationPermission.PORTFOLIOS_DELETE,
      OrganizationPermission.PORTFOLIOS_TRANSFER,
      OrganizationPermission.DEBTORS_READ,
      OrganizationPermission.DEBTORS_WRITE,
      OrganizationPermission.DEBTORS_DELETE,
      OrganizationPermission.DEMOGRAPHICS_READ,
      OrganizationPermission.DEMOGRAPHICS_WRITE,
      OrganizationPermission.DOCUMENTS_READ,
      OrganizationPermission.DOCUMENTS_WRITE,
      OrganizationPermission.VERIFICATIONS_READ,
      OrganizationPermission.VERIFICATIONS_WRITE,
      OrganizationPermission.PAYMENTS_READ,
      OrganizationPermission.PAYMENTS_WRITE,
      OrganizationPermission.TRANSACTIONS_READ,
      OrganizationPermission.ANALYTICS_READ,
      OrganizationPermission.AUDITS_READ,
      OrganizationPermission.GOALS_READ,
      OrganizationPermission.GOALS_WRITE,
      OrganizationPermission.VOICE_CALL,
      OrganizationPermission.VOICE_CALL_READ,
      OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_VIEW,
      OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_MANAGE,
      OrganizationPermission.WORKFLOWS_ESCALATIONS_VIEW,
      OrganizationPermission.WORKFLOWS_ESCALATIONS_MANAGE,
      OrganizationPermission.WORKFLOWS_RULES_VIEW,
      OrganizationPermission.WORKFLOWS_RULES_CREATE,
      OrganizationPermission.WORKFLOWS_RULES_EDIT,
      OrganizationPermission.WORKFLOWS_RULES_DELETE,
      OrganizationPermission.WORKFLOWS_RULES_TOGGLE,
      OrganizationPermission.WORKFLOWS_EXECUTIONS_VIEW,
      OrganizationPermission.WORKFLOWS_ANALYTICS_VIEW,
      OrganizationPermission.WORKFLOWS_TEMPLATES_VIEW,
    ],
  },
  ORG_MANAGER: {
    name: 'ORG_MANAGER',
    description: 'Manages users and oversees collection activities without full admin rights',
    isSystemRole: true,
    permissions: [
      OrganizationPermission.ORGS_READ,
      OrganizationPermission.USERS_READ,
      OrganizationPermission.USERS_WRITE,
      OrganizationPermission.TEAMS_READ,
      OrganizationPermission.TEAMS_MANAGE,
      OrganizationPermission.DEBTS_READ,
      OrganizationPermission.PORTFOLIOS_READ,
      OrganizationPermission.DEBTORS_READ,
      OrganizationPermission.DEBTORS_WRITE,
      OrganizationPermission.DEMOGRAPHICS_READ,
      OrganizationPermission.DEMOGRAPHICS_WRITE,
      OrganizationPermission.DOCUMENTS_READ,
      OrganizationPermission.DOCUMENTS_WRITE,
      OrganizationPermission.VERIFICATIONS_READ,
      OrganizationPermission.VERIFICATIONS_WRITE,
      OrganizationPermission.PAYMENTS_READ,
      OrganizationPermission.ANALYTICS_READ,
      OrganizationPermission.GOALS_READ,
      OrganizationPermission.GOALS_WRITE,
      OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_VIEW,
      OrganizationPermission.WORKFLOWS_ESCALATIONS_VIEW,
      OrganizationPermission.WORKFLOWS_RULES_VIEW,
      OrganizationPermission.WORKFLOWS_EXECUTIONS_VIEW,
      OrganizationPermission.WORKFLOWS_ANALYTICS_VIEW,
      OrganizationPermission.WORKFLOWS_TEMPLATES_VIEW,
    ],
  },
  ORG_TEAM_LEAD: {
    name: 'ORG_TEAM_LEAD',
    description: 'Manages specific team performance and goals',
    isSystemRole: true,
    permissions: [
      OrganizationPermission.ORGS_READ,
      OrganizationPermission.USERS_READ,
      OrganizationPermission.TEAMS_READ,
      OrganizationPermission.DEBTS_READ,
      OrganizationPermission.DEBTORS_READ,
      OrganizationPermission.DEMOGRAPHICS_READ,
      OrganizationPermission.DOCUMENTS_READ,
      OrganizationPermission.VERIFICATIONS_READ,
      OrganizationPermission.ANALYTICS_READ,
      OrganizationPermission.GOALS_READ,
      OrganizationPermission.VOICE_CALL,
    ],
  },
  ORG_COLLECTOR: {
    name: 'ORG_COLLECTOR',
    description: 'Primary operational user, can only interact with assigned portfolios',
    isSystemRole: true,
    permissions: [
      OrganizationPermission.ORGS_READ,
      OrganizationPermission.TEAMS_READ,
      OrganizationPermission.DEBTS_READ,
      OrganizationPermission.DEBTS_NOTES_WRITE,
      OrganizationPermission.DEBTORS_READ,
      OrganizationPermission.DEBTORS_WRITE,
      OrganizationPermission.DEMOGRAPHICS_READ,
      OrganizationPermission.DOCUMENTS_READ,
      OrganizationPermission.DOCUMENTS_WRITE,
      OrganizationPermission.VERIFICATIONS_READ,
      OrganizationPermission.ANALYTICS_READ,
      OrganizationPermission.GOALS_READ,
      OrganizationPermission.VOICE_CALL,
    ],
  },
  ORG_VIEWER: {
    name: 'ORG_VIEWER',
    description: 'Read-only access to organization data',
    isSystemRole: true,
    permissions: [
      OrganizationPermission.ORGS_READ,
      OrganizationPermission.DEBTS_READ,
      OrganizationPermission.DEBTORS_READ,
      OrganizationPermission.DEMOGRAPHICS_READ,
      OrganizationPermission.DOCUMENTS_READ,
      OrganizationPermission.ANALYTICS_READ,
    ],
  },
  DEBTOR: {
    name: 'DEBTOR',
    description: 'Debtor user with access to their own debt information across organizations',
    isSystemRole: true,
    permissions: DEFAULT_DEBTOR_PERMISSIONS,
  },
} as const;

/**
 * Helper: Create an organization-scoped role from a template
 */
export function createOrgRoleFromTemplate(
  template: typeof ORG_ROLE_TEMPLATES[keyof typeof ORG_ROLE_TEMPLATES],
  organizationId: string
) {
  return {
    ...template,
    organizationId,
  };
}

/**
 * Helper: Get all role names (for type safety)
 */
export const ROLE_NAMES = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  ORG_MANAGER: 'ORG_MANAGER',
  ORG_TEAM_LEAD: 'ORG_TEAM_LEAD',
  ORG_COLLECTOR: 'ORG_COLLECTOR',
  DEBTOR: 'DEBTOR',
} as const;