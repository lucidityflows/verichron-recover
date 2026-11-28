/**
 * Debtor-specific permissions
 *
 * These permissions are self-scoped, meaning debtors can only perform
 * actions on their own data. The :self suffix explicitly indicates this.
 *
 * These permissions are used in DEBTOR_USER userType JWTs and enforce
 * ownership-based access control rather than organization-based.
 */
export enum DebtorPermission {
  /**
   * Read own debt information across all associated organizations
   * Enforced with: WHERE debtor_user_id = currentUser.sub
   */
  SELF_READ = 'debtor:self:read',

  /**
   * Make payments on own debts
   * Enforced with: WHERE debtor_user_id = currentUser.sub
   */
  SELF_PAY = 'debtor:self:pay',

  /**
   * Update own profile information (contact details, preferences)
   * Enforced with: WHERE user_id = currentUser.sub
   */
  SELF_UPDATE = 'debtor:self:update',

  /**
   * Export own data (GDPR Article 15 - Right of Access)
   * Returns all personal data across all organizations
   */
  SELF_EXPORT = 'debtor:self:export',

  /**
   * View own payment history across all organizations
   * Enforced with: WHERE debtor_user_id = currentUser.sub
   */
  SELF_PAYMENT_HISTORY = 'debtor:self:payment_history',

  /**
   * View own documents (letters, statements) across all organizations
   * Enforced with: WHERE debtor_user_id = currentUser.sub
   */
  SELF_DOCUMENTS = 'debtor:self:documents',

  /**
   * Update own communication preferences (opt-in/opt-out)
   * Enforced with: WHERE user_id = currentUser.sub
   */
  SELF_PREFERENCES = 'debtor:self:preferences',

  /**
   * Delete own account (GDPR Article 17 - Right to Erasure)
   * Enforced with: WHERE user_id = currentUser.sub
   */
  SELF_DELETE = 'debtor:self:delete',
}

/**
 * Default permissions for DEBTOR role
 * These are automatically assigned to all debtor memberships
 */
export const DEFAULT_DEBTOR_PERMISSIONS: DebtorPermission[] = [
  DebtorPermission.SELF_READ,
  DebtorPermission.SELF_PAY,
  DebtorPermission.SELF_UPDATE,
  DebtorPermission.SELF_EXPORT,
  DebtorPermission.SELF_PAYMENT_HISTORY,
  DebtorPermission.SELF_DOCUMENTS,
  DebtorPermission.SELF_PREFERENCES,
];

/**
 * Check if a permission is a debtor permission
 */
export function isDebtorPermission(permission: string): boolean {
  return permission.startsWith('debtor:');
}

/**
 * Check if a permission requires ownership validation
 */
export function requiresOwnershipCheck(permission: string): boolean {
  return permission.includes(':self:');
}