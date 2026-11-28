import { OrganizationPermission } from './organization-permission.enum';

/**
 * Role hierarchy for organizations
 *
 * These roles define the permission levels within an organization.
 * String values follow the SCREAMING_CASE pattern for consistency across the platform.
 */
export enum OrganizationRole {
  /**
   * Full administrative control over the organization
   */
  ORG_ADMIN = 'ORG_ADMIN',

  /**
   * Can manage multiple teams and view organization-wide metrics
   */
  ORG_MANAGER = 'ORG_MANAGER',

  /**
   * Focuses on specific team goals and member performance
   */
  ORG_TEAM_LEAD = 'ORG_TEAM_LEAD',

  /**
   * Standard collector role - manages assigned work queue items
   */
  ORG_COLLECTOR = 'ORG_COLLECTOR',

  /**
   * Read-only access to organization data
   */
  ORG_VIEWER = 'ORG_VIEWER',
}

/**
 * Role to permission mapping
 * Defines which permissions each role has by default.
 */
export const ROLE_PERMISSIONS: Record<OrganizationRole, OrganizationPermission[]> = {
  [OrganizationRole.ORG_ADMIN]: [
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
    OrganizationPermission.GOALS_READ,
    OrganizationPermission.GOALS_WRITE,
    OrganizationPermission.VOICE_CALL,
    OrganizationPermission.VOICE_CALL_READ,
    OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_MANAGE,
    OrganizationPermission.WORKFLOWS_ESCALATIONS_MANAGE,
    OrganizationPermission.WORKFLOWS_RULES_CREATE,
  ],
  [OrganizationRole.ORG_MANAGER]: [
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
  ],
  [OrganizationRole.ORG_TEAM_LEAD]: [
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
  [OrganizationRole.ORG_COLLECTOR]: [
    OrganizationPermission.ORGS_READ,
    OrganizationPermission.DEBTS_READ,
    OrganizationPermission.DEBTS_NOTES_WRITE,
    OrganizationPermission.DEBTORS_READ,
    OrganizationPermission.DEBTORS_WRITE,
    OrganizationPermission.DEMOGRAPHICS_READ,
    OrganizationPermission.DOCUMENTS_READ,
    OrganizationPermission.DOCUMENTS_WRITE,
    OrganizationPermission.VERIFICATIONS_READ,
    OrganizationPermission.GOALS_READ,
    OrganizationPermission.VOICE_CALL,
  ],
  [OrganizationRole.ORG_VIEWER]: [
    OrganizationPermission.ORGS_READ,
    OrganizationPermission.DEBTS_READ,
    OrganizationPermission.DEBTORS_READ,
    OrganizationPermission.DEMOGRAPHICS_READ,
    OrganizationPermission.DOCUMENTS_READ,
    OrganizationPermission.ANALYTICS_READ,
  ],
};
