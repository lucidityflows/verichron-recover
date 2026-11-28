/**
 * Entity Registry for E2E Tests
 *
 * Imports all TypeORM entities from each microservice for automatic schema generation.
 * This eliminates schema drift between production entities and test schemas.
 */

// ============================================
// API-USERS ENTITIES
// ============================================

import { UserEntity } from '../../apps/api-users/src/profiles/entities/user.entity';
import { UserAddressEntity } from '../../apps/api-users/src/profiles/entities/user-address.entity';
import { UserEmailEntity } from '../../apps/api-users/src/profiles/entities/user-email.entity';
import { UserPhoneNumberEntity } from '../../apps/api-users/src/profiles/entities/user-phone-number.entity';
import { UserMembershipEntity } from '../../apps/api-users/src/profiles/entities/user-membership.entity';
import { RoleEntity } from '../../apps/api-users/src/rbac/entities/role.entity';
import { PermissionEntity } from '../../apps/api-users/src/rbac/entities/permission.entity';
import { RolePermissionEntity } from '../../apps/api-users/src/rbac/entities/role-permission.entity';

// ============================================
// API-ORGANIZATIONS ENTITIES
// ============================================

import { Organization } from '../../apps/api-organizations/src/profiles/entities/organization.entity';
import { OrganizationAddress } from '../../apps/api-organizations/src/profiles/entities/organization-address.entity';
import { OrganizationEmail } from '../../apps/api-organizations/src/profiles/entities/organization-email.entity';
import { OrganizationPhoneNumber } from '../../apps/api-organizations/src/profiles/entities/organization-phone-number.entity';
import { TeamMember } from '../../apps/api-organizations/src/teams/entities/team-member.entity';
import { Team } from '../../apps/api-organizations/src/teams/entities/team.entity';
import { PortfolioTeamAssignment } from '../../apps/api-organizations/src/teams/entities/portfolio-team-assignment.entity';
import { ApprovalThreshold } from '../../apps/api-organizations/src/strategy/entities/approval-threshold.entity';
import { SettlementAuthorityMatrix } from '../../apps/api-organizations/src/strategy/entities/settlement-authority-matrix.entity';

// ============================================
// API-DEBTS ENTITIES
// ============================================

import { Debt } from '../../apps/api-debts/src/debts/entities/debt.entity';
import { DebtDebtor } from '../../apps/api-debts/src/debts/entities/debt-debtor.entity';
import { Portfolio } from '../../apps/api-debts/src/portfolios/entities/portfolio.entity';
import { DebtOwnershipHistory } from '../../apps/api-debts/src/history/entities/debt-ownership-history.entity';
import { ImportJob } from '../../apps/api-debts/src/imports/entities/import-job.entity';
import { UserPortfolioPermission } from '../../apps/api-debts/src/portfolios/entities/user-portfolio-permission.entity';
import { Creditor } from '../../apps/api-debts/src/creditors/entities/creditor.entity';
import { GlobalCreditor } from '../../apps/api-debts/src/creditors/entities/global-creditor.entity';
import { CreditorConflict } from '../../apps/api-debts/src/creditors/entities/creditor-conflict.entity';
import { ChargeOffHistory } from '../../apps/api-debts/src/charge-offs/entities/charge-off-history.entity';

// ============================================
// API-TRANSACTIONS ENTITIES
// ============================================

import { TransactionHistory } from '../../apps/api-transactions/src/transactions/entities/transaction-history.entity';
import { PaymentPlan } from '../../apps/api-transactions/src/payment-plans/entities/payment-plan.entity';
import { PaymentPlanDebt } from '../../apps/api-transactions/src/payment-plans/entities/payment-plan-debt.entity';
import { Document as TransactionDocumentEntity } from '../../apps/api-transactions/src/documents/entities/document.entity';
import { SettlementOffer } from '../../apps/api-transactions/src/settlement-offers/entities/settlement-offer.entity';
import { BankruptcyFiling } from '../../apps/api-transactions/src/bankruptcy-filings/entities/bankruptcy-filing.entity';

// ============================================
// API-DEBTORS ENTITIES
// ============================================

import { DebtorIdentityEntity } from '../../apps/api-debtors/src/identity/entities/debtor-identity.entity';
import { DebtorProfileEntity } from '../../apps/api-debtors/src/profiles/entities/debtor-profile.entity';
import { DebtorAddress } from '../../apps/api-debtors/src/profiles/entities/debtor-address.entity';
import { DebtorEmail } from '../../apps/api-debtors/src/profiles/entities/debtor-email.entity';
import { DebtorPhone } from '../../apps/api-debtors/src/profiles/entities/debtor-phone.entity';
import { DebtorDemographics } from '../../apps/api-debtors/src/demographics/entities/debtor-demographics.entity';
import { VerificationRequest } from '../../apps/api-debtors/src/verifications/entities/verification.entity';
import { Document as DebtorDocumentEntity } from '../../apps/api-debtors/src/documents/entities/document.entity';

// ============================================
// API-COMMUNICATIONS ENTITIES
// ============================================

import { Template } from '../../apps/api-communications/src/templates/entities/template.entity';
import { DebtorPreference } from '../../apps/api-communications/src/preferences/entities/debtor-preference.entity';

// ============================================
// API-COLLECTORS ENTITIES
// ============================================

import { WorkQueueItem } from '../../apps/api-collectors/src/work-queue/entities/work-queue-item.entity';
import { SavedView } from '../../apps/api-collectors/src/work-queue/entities/saved-view.entity';
import { CollectorAction } from '../../apps/api-collectors/src/workstation/entities/collector-action.entity';
import { CollectorNote } from '../../apps/api-collectors/src/notes/entities/collector-note.entity';
import { CollectorProfile } from '../../apps/api-collectors/src/profiles/entities/collector-profile.entity';
import { CollectorResponseTracking } from '../../apps/api-collectors/src/performance/entities/collector-response-tracking.entity';
import { CollectorDailyMetric } from '../../apps/api-collectors/src/performance/entities/collector-daily-metric.entity';
import { TimeTrackingSession } from '../../apps/api-collectors/src/time-tracking/entities/time-tracking-session.entity';
import { Notification } from '../../apps/api-collectors/src/notifications/entities/notification.entity';
import { Goal } from '../../apps/api-collectors/src/goals/entities/goal.entity';
import { GoalProgress } from '../../apps/api-collectors/src/goals/entities/goal-progress.entity';


// ============================================
// API-VOICE ENTITIES
// ============================================

import { CallLog } from '../../apps/api-voice/src/calls/entities/call-log.entity';
import { TwilioConfig } from '../../apps/api-voice/src/twilio-config/entities/twilio-config.entity';

// ============================================
// API-WORKFLOWS ENTITIES
// ============================================

import { AutoAssignmentConfig } from '../../apps/api-workflows/src/auto-assignment/entities/auto-assignment-config.entity';
import { EscalationExecution } from '../../apps/api-workflows/src/escalation-rules/entities/escalation-execution.entity';
import { EscalationRule } from '../../apps/api-workflows/src/escalation-rules/entities/escalation-rule.entity';
import { WorkflowExecution } from '../../apps/api-workflows/src/workflow-executions/entities/workflow-execution.entity';
import { WorkflowRule } from '../../apps/api-workflows/src/workflow-rules/entities/workflow-rule.entity';
import { WorkflowTemplate } from '../../apps/api-workflows/src/workflow-templates/entities/workflow-template.entity';

// ============================================
// API-AUTOMATIONS ENTITIES
// ============================================

// Note: api-automations is a purely event-driven service and has no database entities.
// This is included for completeness and future-proofing.
export const API_AUTOMATIONS_ENTITIES = [];

// ============================================
// API-ANALYTICS ENTITIES
// ============================================

// Note: api-analytics uses Redis for caching and has no database entities yet.
export const API_ANALYTICS_ENTITIES = [];

// ============================================
// API-AUDITS ENTITIES
// ============================================

import { AuditLog } from '../../apps/api-audits/src/storage/entities/audit-log.entity';

export const API_AUDITS_ENTITIES = [
  AuditLog,
];


/**
 * All entities for api-users microservice
 */
export const API_USERS_ENTITIES = [
  UserEntity,
  UserAddressEntity,
  UserEmailEntity,
  UserPhoneNumberEntity,
  UserMembershipEntity,
  RoleEntity,
  PermissionEntity,
  RolePermissionEntity,
];

/**
 * All entities for api-organizations microservice
 */
export const API_ORGANIZATIONS_ENTITIES = [
  Organization,
  OrganizationAddress,
  OrganizationEmail,
  OrganizationPhoneNumber,
  Team,
  TeamMember,
  PortfolioTeamAssignment,
  ApprovalThreshold,
  SettlementAuthorityMatrix,
];

/**
 * All entities for api-debts microservice
 */
export const API_DEBTS_ENTITIES = [
  Debt,
  DebtDebtor,
  Portfolio,
  DebtOwnershipHistory,
  ImportJob,
  UserPortfolioPermission,
  Creditor,
  GlobalCreditor,
  CreditorConflict,
  ChargeOffHistory,
];

/**
 * All entities for api-transactions microservice
 */
export const API_TRANSACTIONS_ENTITIES = [
  TransactionHistory,
  PaymentPlan,
  PaymentPlanDebt,
  TransactionDocumentEntity,
  SettlementOffer,
  BankruptcyFiling,
];

/**
 * All entities for api-debtors microservice
 */
export const API_DEBTORS_ENTITIES = [
  DebtorIdentityEntity,
  DebtorProfileEntity,
  DebtorAddress,
  DebtorEmail,
  DebtorPhone,
  DebtorDemographics,
  VerificationRequest,
  DebtorDocumentEntity,
];

/**
 * All entities for api-communications microservice
 */
export const API_COMMUNICATIONS_ENTITIES = [
  Template,
  DebtorPreference,
];

/**
 * All entities for api-collectors microservice
 */
export const API_COLLECTORS_ENTITIES = [
  WorkQueueItem,
  SavedView,
  CollectorAction,
  CollectorNote,
  CollectorProfile,
  CollectorResponseTracking,
  CollectorDailyMetric,
  TimeTrackingSession,
  Notification,
  Goal,
  GoalProgress
];

/**
 * All entities for api-collectors microservice
 */
export const API_VOICE_ENTITIES = [
  CallLog,
  TwilioConfig
];

/**
 * All entities for api-collectors microservice
 */
export const API_WORKFLOWS_ENTITIES = [
  AutoAssignmentConfig,
  EscalationRule,
  EscalationExecution,
  WorkflowExecution,
  WorkflowRule,
  WorkflowTemplate
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all entities for a specific microservice
 */
export function getEntitiesForService(serviceName: string): any[] {
  switch (serviceName) {
    case 'api-users':
      return API_USERS_ENTITIES;
    case 'api-organizations':
      return API_ORGANIZATIONS_ENTITIES;
    case 'api-debts':
      return API_DEBTS_ENTITIES;
    case 'api-transactions':
      return API_TRANSACTIONS_ENTITIES;
    case 'api-debtors':
      return API_DEBTORS_ENTITIES;
    case 'api-communications':
      return API_COMMUNICATIONS_ENTITIES;
    case 'api-collectors':
      return API_COLLECTORS_ENTITIES;
    case 'api-voice':
      return API_VOICE_ENTITIES;
    case 'api-workflows':
      return API_WORKFLOWS_ENTITIES;
    case 'api-automations':
      return API_AUTOMATIONS_ENTITIES;
    case 'api-analytics':
      return API_ANALYTICS_ENTITIES;
    case 'api-audits':
      return API_AUDITS_ENTITIES;
    default:
      throw new Error(`Unknown service: ${serviceName}. Valid services: api-users, api-organizations, api-debtors, api-debts, api-transactions, api-communications, api-collectors, api-analytics, api-audits`);
  }
}

/**
 * Get all entities across all microservices
 */
export function getAllEntities(): any[] {
  return [
    ...API_USERS_ENTITIES,
    ...API_ORGANIZATIONS_ENTITIES,
    ...API_DEBTS_ENTITIES,
    ...API_TRANSACTIONS_ENTITIES,
    ...API_DEBTORS_ENTITIES,
    ...API_COMMUNICATIONS_ENTITIES,
    ...API_COLLECTORS_ENTITIES,
    ...API_VOICE_ENTITIES,
    ...API_WORKFLOWS_ENTITIES,
    ...API_AUTOMATIONS_ENTITIES,
    ...API_ANALYTICS_ENTITIES,
    ...API_AUDITS_ENTITIES,
  ];
}
