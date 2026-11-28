/**
 * Granular permissions for fine-grained access control within an organization.
 */
export enum OrganizationPermission {
  // Organization Management
  ORGS_READ = 'orgs:read',
  ORGS_WRITE = 'orgs:write',
  ORGS_DELETE = 'orgs:delete',
  ORGS_SETTINGS_READ = 'orgs:settings:read',
  ORGS_SETTINGS_WRITE = 'orgs:settings:write',

  // Goals & Performance
  GOALS_READ = 'goals:read',
  GOALS_WRITE = 'goals:write',

  // Team Management
  TEAMS_READ = 'teams:read',
  TEAMS_MANAGE = 'teams:manage',

  // User Management
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
  USERS_DELETE = 'users:delete',
  USERS_ROLES_ASSIGN = 'users:roles:assign',

  // Debt Management
  DEBTS_READ = 'debts:read',
  DEBTS_WRITE = 'debts:write',
  DEBTS_DELETE = 'debts:delete',
  DEBTS_NOTES_WRITE = 'debts:notes:write',

  // Portfolio Management
  PORTFOLIOS_READ = 'portfolios:read',
  PORTFOLIOS_WRITE = 'portfolios:write',
  PORTFOLIOS_DELETE = 'portfolios:delete',
  PORTFOLIOS_TRANSFER = 'portfolios:transfer',

  // Debtor Management
  DEBTORS_READ = 'debtors:read',
  DEBTORS_WRITE = 'debtors:write',
  DEBTORS_DELETE = 'debtors:delete',
  DEMOGRAPHICS_READ = 'demographics:read',
  DEMOGRAPHICS_WRITE = 'demographics:write',
  DOCUMENTS_READ = 'documents:read',
  DOCUMENTS_WRITE = 'documents:write',
  VERIFICATIONS_READ = 'verifications:read',
  VERIFICATIONS_WRITE = 'verifications:write',

  // Payment & Transaction Management
  PAYMENTS_READ = 'payments:read',
  PAYMENTS_WRITE = 'payments:write',
  TRANSACTIONS_READ = 'transactions:read',
  TRANSACTIONS_WRITE = 'transactions:write',

  // Analytics
  ANALYTICS_READ = 'analytics:read',

  // Audit Logs (Compliance)
  AUDITS_READ = 'audits:read',

  // Voice & Communication
  VOICE_CALL = 'voice:call',
  VOICE_CALL_READ = 'voice:call:read',
  VOICE_MANAGE = 'voice:manage',
  COMMUNICATIONS_MANAGE = 'communications:manage',

  // Workflow Automation
  WORKFLOWS_AUTO_ASSIGNMENT_MANAGE = 'workflows:auto-assignment:manage',
  WORKFLOWS_AUTO_ASSIGNMENT_VIEW = 'workflows:auto-assignment:view',
  WORKFLOWS_ESCALATIONS_MANAGE = 'workflows:escalations:manage',
  WORKFLOWS_ESCALATIONS_VIEW = 'workflows:escalations:view',
  WORKFLOWS_ANALYTICS_VIEW = 'workflows:analytics:view',
  WORKFLOWS_EXECUTIONS_VIEW = 'workflows:executions:view',
  WORKFLOWS_RULES_CREATE = 'workflows:rules:create',
  WORKFLOWS_RULES_VIEW = 'workflows:rules:view',
  WORKFLOWS_RULES_EDIT = 'workflows:rules:edit',
  WORKFLOWS_RULES_DELETE = 'workflows:rules:delete',
  WORKFLOWS_RULES_TOGGLE = 'workflows:rules:toggle',
  WORKFLOWS_TEMPLATES_VIEW = 'workflows:templates:view',

  // Debtor Self-Service (for DEBTOR user type)
  DEBTOR_SELF_READ = 'debtor:self:read',
  DEBTOR_SELF_PAY = 'debtor:self:pay',
  DEBTOR_SELF_UPDATE = 'debtor:self:update',
  DEBTOR_SELF_EXPORT = 'debtor:self:export',
  DEBTOR_SELF_PAYMENT_HISTORY = 'debtor:self:payment_history',
  DEBTOR_SELF_DOCUMENTS = 'debtor:self:documents',
  DEBTOR_SELF_PREFERENCES = 'debtor:self:preferences',
}
