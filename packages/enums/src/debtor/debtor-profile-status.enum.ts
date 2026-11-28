/**
 * Debtor Profile Status Enumeration
 *
 * Tracks the lifecycle status of a debtor profile within an organization.
 *
 * Lifecycle Flow:
 * 1. PENDING_INVITATION: Profile created during portfolio import, user not yet invited
 * 2. INVITED: Invitation sent to debtor, awaiting acceptance
 * 3. ACTIVE: Debtor accepted invitation and has access to view their debts
 * 4. INACTIVE: Debtor declined invitation or removed their own access
 * 5. SUSPENDED: Organization suspended debtor's access (administrative action)
 *
 * Query Patterns:
 * - Active Profiles: WHERE status = 'ACTIVE'
 * - Pending Invitations: WHERE status IN ('PENDING_INVITATION', 'INVITED')
 * - Accessible Profiles: WHERE status = 'ACTIVE' AND deletedAt IS NULL
 *
 * Multi-Org Support:
 * - Each DebtorProfile has its own status per organization
 * - Same debtor identity can have different statuses across organizations
 * - Example: Jane's profile at Acme = ACTIVE, Jane's profile at XYZ = INVITED
 *
 * Right-to-be-Forgotten:
 * - Set status to INACTIVE when user removes access to specific org
 * - Soft delete (deletedAt) for permanent removal while maintaining audit trail
 *
 * @see DebtorProfile entity in api-debtors
 * @see DEBTOR-USER-ARCHITECTURE.md for multi-context authentication strategy
 * @see MULTI-ORG-DEBTOR-COMPLIANCE-STRATEGY.md for compliance considerations
 */
export enum DebtorProfileStatus {
  /**
   * Profile created during portfolio import but user not yet invited.
   * Default state when debtor data is imported from CSV.
   *
   * Transitions to:
   * - INVITED: When organization sends invitation
   * - ACTIVE: When imported debtor already has account and auto-accepts
   */
  PENDING_INVITATION = 'PENDING_INVITATION',

  /**
   * Invitation sent to debtor, awaiting user acceptance.
   * Email sent via api-communications with activation link.
   *
   * Transitions to:
   * - ACTIVE: When debtor accepts invitation (clicks activation link)
   * - INACTIVE: When debtor declines or invitation expires
   */
  INVITED = 'INVITED',

  /**
   * Debtor has accepted invitation and has active access to view debts.
   * This status enables debtor to query debts via /my-debts endpoint.
   *
   * Transitions to:
   * - INACTIVE: When debtor removes their own access
   * - SUSPENDED: When organization suspends access (admin action)
   */
  ACTIVE = 'ACTIVE',

  /**
   * Debtor declined invitation or removed their own access.
   * Profile remains for audit trail but debtor cannot access debts.
   *
   * Transitions to:
   * - ACTIVE: When debtor re-accepts invitation (if org re-invites)
   */
  INACTIVE = 'INACTIVE',

  /**
   * Organization administratively suspended debtor's access.
   * Used for compliance, disputes, or policy violations.
   *
   * Transitions to:
   * - ACTIVE: When organization lifts suspension
   * - INACTIVE: When permanently deactivated
   */
  SUSPENDED = 'SUSPENDED',
}
