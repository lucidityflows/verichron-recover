import { UserStatus } from '@verichron/enums';

/**
 * User mapping for a created/found debtor user
 */
export interface DebtorUserMapping {
  /** Global debtor identity ID (from api-debtors) */
  debtorIdentityId: string;

  /** Created or existing user ID */
  userId: string;

  /** Email associated with the user */
  email: string;

  /** User status (PROVISIONAL until activation) */
  status: UserStatus.PROVISIONAL | UserStatus.ACTIVE;

  /** Whether this was a newly created user (false if already existed) */
  isNewUser: boolean;

  /** Invitation token for account activation (optional, only for new users) */
  invitationToken?: string;

  /** Timestamp when invitation token expires (optional) */
  invitationExpiresAt?: string;
}

/**
 * Payload for DebtorUserCreatedBatch event
 *
 * Published by api-users after processing debtor invitation batch.
 * Consumed by api-debtors to link userIds to debtor identities.
 *
 * Event Flow:
 * 1. api-users receives DEBTORS_INVITATION_BATCH_SENT
 * 2. api-users processes each invitation:
 *    - Checks if user exists for identityId (deduplication)
 *    - Creates new provisional user if needed
 *    - Links email to user account
 * 3. api-users publishes this event with userId mappings
 * 4. api-debtors receives and updates DebtorIdentity.userId
 * 5. api-debtors publishes DEBTORS_USER_LINKED (triggers Redis index)
 *
 * Deduplication:
 * - If debtor already has userId: reuse it, set isNewUser: false
 * - If multiple orgs invite same identity: only first creates user
 * - User gains access to all orgs upon activation
 *
 * Provisional Status:
 * - Users start as PROVISIONAL until they activate account
 * - Activation triggers USERS_DEBTOR_USER_ACTIVATED event
 * - Status changes to ACTIVE upon activation
 */
export interface DebtorUserCreatedBatchPayload {
  /** Links back to the invitation batch that triggered this */
  invitationBatchId: string;

  /** Organization that initiated the invitations */
  organizationId: string;

  /** Batch number (matches invitation batch) */
  batchNumber: number;

  /** User mappings (identityId → userId) */
  userMappings: DebtorUserMapping[];

  /** Timestamp when users were created */
  createdAt: string;
}
