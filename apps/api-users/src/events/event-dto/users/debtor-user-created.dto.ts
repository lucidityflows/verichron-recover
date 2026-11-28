import { IsUUID, IsEmail, IsString, IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { DebtorUserCreatedPayload } from '@verichron/events';
import { UserStatus } from '@verichron/enums';

/**
 * Event DTO for DebtorUserCreated event (single invitation)
 *
 * Published by api-users after processing a single debtor invitation
 * Consumed by api-debtors to link the userId to the debtor identity
 */
export class DebtorUserCreatedDto implements DebtorUserCreatedPayload {
  @IsUUID()
  debtorProfileId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  userId: string;

  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEnum(UserStatus)
  status: UserStatus;

  @IsBoolean()
  isNewUser: boolean;

  @IsDateString()
  createdAt: string;

  @IsString()
  @IsOptional()
  invitationToken?: string;

  @IsDateString()
  @IsOptional()
  invitationExpiresAt?: string;
}
