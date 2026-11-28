import { IsUUID, IsEmail, IsString } from 'class-validator';
import { DebtorInvitationRequestedPayload } from '@verichron/events';

/**
 * Event DTO for DebtorInvitationRequested event
 *
 * Published when a new debtor user is invited.
 * Implements DebtorInvitationRequestedDto from @verichron/events for type safety.
 */
export class DebtorInvitationRequestedDto implements DebtorInvitationRequestedPayload {
  /**
   * The ID of the debtor profile that was invited.
   */
  @IsUUID()
  debtorProfileId: string;

  /**
   * The global ID of the debtor identity.
   */
  @IsUUID()
  debtorIdentityId: string;

  /**
   * The ID of the organization that owns the debtor profile.
   */
  @IsUUID()
  organizationId: string;

  /**
   * The email address the invitation was sent to.
   */
  @IsEmail()
  email: string;

  /**
   * The first name provided in the invitation.
   */
  @IsString()
  firstName: string;

  /**
   * The last name provided in the invitation.
   */
  @IsString()
  lastName: string;

  /**
   * The ID of the user who initiated the invitation.
   */
  @IsUUID()
  invitedBy: string;
}
