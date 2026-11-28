import { UserStatus } from '@verichron/enums';

/**
 * Payload for DebtorUserCreated event (single invitation)
 *
 * Published by api-users after processing a single debtor invitation.
 * Consumed by api-debtors to link the userId to the debtor identity.
 *
 * Event Flow:
 * 1. api-debtors receives single debtor invitation request
 * 2. api-debtors publishes DEBTORS_PROFILE_INVITED
 * 3. api-users receives and processes:
 *    - Checks if user exists for email (deduplication)
 *    - Creates new provisional user if needed
 *    - Links email to user account
 * 4. api-users publishes this event with userId
 * 5. api-debtors receives and updates DebtorIdentity.userId
 * 6. api-debtors publishes DEBTORS_USER_LINKED (triggers Redis index)
 */
export interface DebtorUserCreatedPayload {
  /** Debtor profile ID that was invited */
  debtorProfileId: string;

  /** Organization that initiated the invitation */
  organizationId: string;

  /** Created or existing user ID */
  userId: string;

  /** Email associated with the user */
  email: string;

  /** First name of the user */
  firstName: string;

  /** Last name of the user */
  lastName: string;

  /** User status (PROVISIONAL until activation) */
  status: UserStatus;

  /** Whether this was a newly created user (false if already existed) */
  isNewUser: boolean;

  /** Timestamp when user was created or found */
  createdAt: string;

  /** Invitation token for account activation (optional, only for new users) */
  invitationToken?: string;

  /** Timestamp when invitation token expires (optional) */
  invitationExpiresAt?: string;
}
