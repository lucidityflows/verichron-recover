import { IsEmail, IsString, IsUUID } from 'class-validator';
import { DebtorInvitationRequestedPayload } from '@verichron/events';

/**
 * Event DTO for DEBTORS_INVITATION_REQUESTED event
 *
 * Received from api-debtors when a single debtor is invited to create a user account.
 * Used to validate event payload before processing.
 */
export class DebtorInvitationRequestedDto implements DebtorInvitationRequestedPayload {
  @IsUUID()
  debtorProfileId: string;

  @IsUUID()
  debtorIdentityId: string;

  @IsUUID()
  organizationId: string;

  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsUUID()
  invitedBy: string;
}
