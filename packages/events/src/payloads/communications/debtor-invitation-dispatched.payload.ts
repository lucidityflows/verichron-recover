/**
 * Payload for the 'communications.debtor_invitation.dispatched' event.
 *
 * Published by api-communications after an invitation has been successfully dispatched.
 */
export interface DebtorInvitationDispatchedPayload {
  /** Organization-specific debtor profile ID */
  debtorProfileId: string;

  /** Global debtor identity ID (links to user) */
  debtorIdentityId: string;

  /** Debtor's email address where invitation was sent */
  email: string;
}
