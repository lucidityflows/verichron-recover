/**
 * Payload for the 'debtors.invitation.requested' event
 */
export interface DebtorInvitationRequestedPayload {
  /**
   * The ID of the debtor profile that was invited.
   */
  debtorProfileId: string;

  /**
   * The global ID of the debtor identity being invited.
   */
  debtorIdentityId: string;

  /**
   * The ID of the organization that owns the debtor profile.
   */
  organizationId: string;

  /**
   * The email address the invitation was sent to.
   */
  email: string;

  /**
   * The first name provided in the invitation.
   */
  firstName: string;

  /**
   * The last name provided in the invitation.
   */
  lastName: string;

  /**
   * The ID of the user who initiated the invitation.
   */
  invitedBy: string;
}
