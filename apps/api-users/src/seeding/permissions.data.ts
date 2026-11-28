import { OrganizationPermission, PlatformPermission } from '@verichron/enums';

/**
 * Platform Permissions
 *
 * This is the complete list of permissions for the MVP.
 * api-users is the Single Source of Truth for all platform permissions,
 * even those enforced by other services.
 */
export const PLATFORM_PERMISSIONS = [
  // Organization Management (orgs:*)
  {
    code: OrganizationPermission.ORGS_READ,
    description: 'Read organization details',
    resource: 'organization',
    action: 'read',
  },
  {
    code: OrganizationPermission.ORGS_WRITE,
    description: 'Update organization details',
    resource: 'organization',
    action: 'write',
  },
  {
    code: OrganizationPermission.ORGS_DELETE,
    description: 'Deactivate an organization',
    resource: 'organization',
    action: 'delete',
  },
  {
    code: OrganizationPermission.ORGS_SETTINGS_READ,
    description: 'Read organization settings',
    resource: 'organization',
    action: 'settings:read',
  },
  {
    code: OrganizationPermission.ORGS_SETTINGS_WRITE,
    description: 'Update organization settings',
    resource: 'organization',
    action: 'settings:write',
  },

  // Goals & Performance (goals:*)
  {
    code: OrganizationPermission.GOALS_READ,
    description: 'View performance goals and progress',
    resource: 'goals',
    action: 'read',
  },
  {
    code: OrganizationPermission.GOALS_WRITE,
    description: 'Manage performance goals',
    resource: 'goals',
    action: 'write',
  },

  // Team Management (teams:*)
  {
    code: OrganizationPermission.TEAMS_READ,
    description: 'View teams and memberships',
    resource: 'teams',
    action: 'read',
  },
  {
    code: OrganizationPermission.TEAMS_MANAGE,
    description: 'Manage teams and assign members',
    resource: 'teams',
    action: 'manage',
  },

  // User Management (users:*)
  {
    code: OrganizationPermission.USERS_READ,
    description: 'View users in the organization',
    resource: 'user',
    action: 'read',
  },
  {
    code: OrganizationPermission.USERS_WRITE,
    description: 'Invite or update users',
    resource: 'user',
    action: 'write',
  },
  {
    code: OrganizationPermission.USERS_DELETE,
    description: 'Deactivate user accounts',
    resource: 'user',
    action: 'delete',
  },
  {
    code: OrganizationPermission.USERS_ROLES_ASSIGN,
    description: 'Assign roles to users',
    resource: 'user',
    action: 'roles:assign',
  },

  // Debt Management (debts:*)
  {
    code: OrganizationPermission.DEBTS_READ,
    description: 'View debt details',
    resource: 'debt',
    action: 'read',
  },
  {
    code: OrganizationPermission.DEBTS_WRITE,
    description: 'Manage debt records',
    resource: 'debt',
    action: 'write',
  },
  {
    code: OrganizationPermission.DEBTS_DELETE,
    description: 'Delete debt records',
    resource: 'debt',
    action: 'delete',
  },
  {
    code: OrganizationPermission.DEBTS_NOTES_WRITE,
    description: 'Add or update notes on a debt',
    resource: 'debt',
    action: 'notes:write',
  },

  // Portfolio Management (portfolios:*)
  {
    code: OrganizationPermission.PORTFOLIOS_READ,
    description: 'View portfolios',
    resource: 'portfolio',
    action: 'read',
  },
  {
    code: OrganizationPermission.PORTFOLIOS_WRITE,
    description: 'Manage portfolios',
    resource: 'portfolio',
    action: 'write',
  },
  {
    code: OrganizationPermission.PORTFOLIOS_DELETE,
    description: 'Delete portfolios',
    resource: 'portfolio',
    action: 'delete',
  },
  {
    code: OrganizationPermission.PORTFOLIOS_TRANSFER,
    description: 'Transfer a portfolio to another organization',
    resource: 'portfolio',
    action: 'transfer',
  },

  // Debtor Management (debtors:*)
  {
    code: OrganizationPermission.DEBTORS_READ,
    description: 'View debtor profiles',
    resource: 'debtor',
    action: 'read',
  },
  {
    code: OrganizationPermission.DEBTORS_WRITE,
    description: 'Manage debtor profiles',
    resource: 'debtor',
    action: 'write',
  },
  {
    code: OrganizationPermission.DEBTORS_DELETE,
    description: 'Delete debtor records',
    resource: 'debtor',
    action: 'delete',
  },
  {
    code: OrganizationPermission.DEMOGRAPHICS_READ,
    description: 'View sensitive debtor demographics',
    resource: 'demographics',
    action: 'read',
  },
  {
    code: OrganizationPermission.DEMOGRAPHICS_WRITE,
    description: 'Manage debtor demographics',
    resource: 'demographics',
    action: 'write',
  },
  {
    code: OrganizationPermission.DOCUMENTS_READ,
    description: 'View debtor documents',
    resource: 'documents',
    action: 'read',
  },
  {
    code: OrganizationPermission.DOCUMENTS_WRITE,
    description: 'Manage debtor documents',
    resource: 'documents',
    action: 'write',
  },
  {
    code: OrganizationPermission.VERIFICATIONS_READ,
    description: 'View debtor verifications',
    resource: 'verifications',
    action: 'read',
  },
  {
    code: OrganizationPermission.VERIFICATIONS_WRITE,
    description: 'Manage debtor verifications',
    resource: 'verifications',
    action: 'write',
  },

  // Payment Management (payments:*, transactions:*)
  {
    code: OrganizationPermission.PAYMENTS_READ,
    description: 'View payment history',
    resource: 'payments',
    action: 'read',
  },
  {
    code: OrganizationPermission.PAYMENTS_WRITE,
    description: 'Process payments',
    resource: 'payments',
    action: 'write',
  },
  {
    code: OrganizationPermission.TRANSACTIONS_READ,
    description: 'View detailed transaction logs',
    resource: 'transactions',
    action: 'read',
  },

  // Analytics & Reporting (analytics:*)
  {
    code: OrganizationPermission.ANALYTICS_READ,
    description: 'Access analytics and dashboards',
    resource: 'analytics',
    action: 'read',
  },

  // Audit Logs (Compliance) (audits:*)
  {
    code: OrganizationPermission.AUDITS_READ,
    description: 'View audit logs for compliance',
    resource: 'audits',
    action: 'read',
  },

  // Voice & Communication (voice:*)
  {
    code: OrganizationPermission.VOICE_CALL,
    description: 'Initiate outbound calls',
    resource: 'voice',
    action: 'call',
  },
  {
    code: OrganizationPermission.VOICE_CALL_READ,
    description: 'View call history',
    resource: 'voice',
    action: 'call:read',
  },

  // Workflow Automation (workflows:*)
  {
    code: OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_MANAGE,
    description: 'Manage auto-assignment rules',
    resource: 'workflows',
    action: 'auto-assignment:manage',
  },
  {
    code: OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_VIEW,
    description: 'View auto-assignment settings',
    resource: 'workflows',
    action: 'auto-assignment:view',
  },
  {
    code: OrganizationPermission.WORKFLOWS_ESCALATIONS_MANAGE,
    description: 'Manage escalation rules',
    resource: 'workflows',
    action: 'escalations:manage',
  },
  {
    code: OrganizationPermission.WORKFLOWS_ESCALATIONS_VIEW,
    description: 'View escalation rules',
    resource: 'workflows',
    action: 'escalations:view',
  },
  {
    code: OrganizationPermission.WORKFLOWS_ANALYTICS_VIEW,
    description: 'View workflow performance metrics',
    resource: 'workflows',
    action: 'analytics:view',
  },
  {
    code: OrganizationPermission.WORKFLOWS_EXECUTIONS_VIEW,
    description: 'View workflow execution logs',
    resource: 'workflows',
    action: 'executions:view',
  },
  {
    code: OrganizationPermission.WORKFLOWS_RULES_CREATE,
    description: 'Create new workflow rules',
    resource: 'workflows',
    action: 'rules:create',
  },
  {
    code: OrganizationPermission.WORKFLOWS_RULES_VIEW,
    description: 'View workflow rules',
    resource: 'workflows',
    action: 'rules:view',
  },
  {
    code: OrganizationPermission.WORKFLOWS_RULES_EDIT,
    description: 'Edit existing workflow rules',
    resource: 'workflows',
    action: 'rules:edit',
  },
  {
    code: OrganizationPermission.WORKFLOWS_RULES_DELETE,
    description: 'Delete workflow rules',
    resource: 'workflows',
    action: 'rules:delete',
  },
  {
    code: OrganizationPermission.WORKFLOWS_RULES_TOGGLE,
    description: 'Enable or disable workflow rules',
    resource: 'workflows',
    action: 'rules:toggle',
  },
  {
    code: OrganizationPermission.WORKFLOWS_TEMPLATES_VIEW,
    description: 'View communication templates',
    resource: 'workflows',
    action: 'templates:view',
  },

  // Debtor Self-Service (debtor:self:*)
  {
    code: OrganizationPermission.DEBTOR_SELF_READ,
    description: 'Read own debtor profile and debts',
    resource: 'debtor:self',
    action: 'read',
  },
  {
    code: OrganizationPermission.DEBTOR_SELF_PAY,
    description: 'Initiate payments on own debts',
    resource: 'debtor:self',
    action: 'pay',
  },
  {
    code: OrganizationPermission.DEBTOR_SELF_UPDATE,
    description: 'Update own contact information',
    resource: 'debtor:self',
    action: 'update',
  },
  {
    code: OrganizationPermission.DEBTOR_SELF_EXPORT,
    description: 'Export own debt data',
    resource: 'debtor:self',
    action: 'export',
  },
  {
    code: OrganizationPermission.DEBTOR_SELF_PAYMENT_HISTORY,
    description: 'View own payment history',
    resource: 'debtor:self',
    action: 'payment_history',
  },
  {
    code: OrganizationPermission.DEBTOR_SELF_DOCUMENTS,
    description: 'View and upload own documents',
    resource: 'debtor:self',
    action: 'documents',
  },
  {
    code: OrganizationPermission.DEBTOR_SELF_PREFERENCES,
    description: 'Manage own communication preferences',
    resource: 'debtor:self',
    action: 'preferences',
  },

  // Platform-level permissions (platform:*)
  {
    code: PlatformPermission.ORGS_CREATE,
    description: 'Create new organizations',
    resource: 'platform',
    action: 'orgs:create',
  },
  {
    code: PlatformPermission.ORGS_READ,
    description: 'Read all organizations',
    resource: 'platform',
    action: 'orgs:read',
  },
  {
    code: PlatformPermission.ORGS_DELETE,
    description: 'Delete organizations',
    resource: 'platform',
    action: 'orgs:delete',
  },
  {
    code: PlatformPermission.ORGS_UPDATE,
    description: 'Update organization settings',
    resource: 'platform',
    action: 'orgs:update',
  },
  {
    code: PlatformPermission.ORGS_SUSPEND,
    description: 'Suspend or unsuspend organizations',
    resource: 'platform',
    action: 'orgs:suspend',
  },
  {
    code: PlatformPermission.ORGS_MANAGE,
    description: 'Full management access to all organization operations',
    resource: 'platform',
    action: 'orgs:manage',
  },
  {
    code: PlatformPermission.USERS_MANAGE,
    description: 'Full management access to all user operations across organizations',
    resource: 'platform',
    action: 'users:manage',
  },
  {
    code: PlatformPermission.USERS_IMPERSONATE,
    description: 'Impersonate users for support purposes',
    resource: 'platform',
    action: 'users:impersonate',
  },
  {
    code: PlatformPermission.DEBTORS_MANAGE,
    description: 'Full management access to all debtors across organizations',
    resource: 'platform',
    action: 'debtors:manage',
  },
  {
    code: PlatformPermission.ROLES_MANAGE,
    description: 'Full management access to view roles across all organizations',
    resource: 'platform',
    action: 'roles:manage',
  },
  {
    code: PlatformPermission.SYSTEM_SETTINGS,
    description: 'Access to system-wide configuration',
    resource: 'platform',
    action: 'system:settings',
  },
  {
    code: PlatformPermission.AUDIT_VIEW,
    description: 'View audit logs across all organizations',
    resource: 'platform',
    action: 'audit:view',
  },
  {
    code: PlatformPermission.TEAMS_MANAGE,
    description: 'Platform-level team management',
    resource: 'platform',
    action: 'teams:manage',
  },
];
