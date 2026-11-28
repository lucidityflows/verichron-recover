import type { DebtorInvitationRequestedPayload } from './debtor-invitation-requested.payload';

/**
 * Payload for DebtorInvitationBatchRequested event
 *
 * Published by api-debtors when org admin invites debtors (usually entire portfolio).
 * Consumed by api-users to create provisional user accounts.
 *
 * Event Flow:
 * 1. Org admin clicks "Invite Portfolio Debtors" in api-debtors
 * 2. api-debtors queries all profiles for portfolio
 * 3. api-debtors publishes invitation batches (100 per batch)
 * 4. api-users receives and creates provisional users
 * 5. api-users publishes USERS_DEBTOR_USER_CREATED with userId mappings
 * 6. api-debtors receives and links userIds to identities
 *
 * Multi-Org Handling:
 * - Same debtor identity can receive invitations from multiple orgs
 * - api-users deduplicates: only creates ONE user per identityId
 * - User gains access to all orgs that invited them upon activation
 */
export interface DebtorInvitationBatchRequestedPayload {
  /** Unique identifier for this invitation batch */
  invitationBatchId: string;

  /** Organization sending the invitations */
  organizationId: string;

  /** Portfolio being invited (if applicable) */
  portfolioId?: string;

  /** User ID of org admin who initiated invitations */
  invitedBy: string;

  /** Batch number (1-indexed) */
  batchNumber: number;

  /** Total number of batches in this invitation job */
  totalBatches: number;

  /** Invitations in this batch (typically 100 per batch) */
  invitations: DebtorInvitationRequestedPayload[];

  /** Timestamp when invitations were sent */
  invitedAt: string;
}
