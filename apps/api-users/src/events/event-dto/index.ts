// src/events/dto/index.ts

// Base

// Constants
export { EVENT_DTO_MAP } from './constants';

// User Events
export * from './users/membership-created.dto';
export * from './users/user-created.dto';
export * from './users/debtor-user-created.dto';
export * from './users/debtor-user-created-batch.dto';
export * from './users/user-activated.dto';
export * from './users/user-profile-updated.dto';
export * from './users/user-status-changed.dto';
export * from './users/user-deleted.dto';

// Auth Events
export * from './auth/login-success.dto';
export * from './auth/login-failed.dto';
export * from './auth/token-issued.dto';
export * from './auth/context-switched.dto';
export * from './auth/password-reset-requested.dto';

// Organization Events
export * from './organizations/organization-created.dto';
export * from './organizations/organization-updated.dto';
export * from './organizations/organization-name-changed.dto';
export * from './organizations/organization-status-changed.dto';
export * from './organizations/organization-suspended.dto';
export * from './organizations/organization-reactivated.dto';

// Role Events
export * from './roles/role-created.dto';
export * from './roles/role-updated.dto';
export * from './roles/role-deleted.dto';
export * from './roles/role-assigned.dto';
export * from './roles/role-unassigned.dto';
export * from './roles/permissions-changed.dto';

// Debtor Events

export * from './debtors/debtor-invitation-requested.dto';

export * from './debtors/debtor-invitation-batch-requested.dto';
