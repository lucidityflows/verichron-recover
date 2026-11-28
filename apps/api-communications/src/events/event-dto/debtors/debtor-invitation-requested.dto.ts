import { IsString, IsNotEmpty, IsUUID, IsEmail } from 'class-validator';
import type { DebtorInvitationRequestedPayload } from '@verichron/events';

// Nested DTO for individual invitations within the batch
export class DebtorInvitationRequestedDto implements DebtorInvitationRequestedPayload {

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  invitedBy: string;

  @IsUUID()
  @IsNotEmpty()
  debtorProfileId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorIdentityId: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;
}

