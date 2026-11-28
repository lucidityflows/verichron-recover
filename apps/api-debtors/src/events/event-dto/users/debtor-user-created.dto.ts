import { IsBoolean, IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DebtorUserCreatedPayload } from '@verichron/events';
import { UserStatus } from '@verichron/enums';

/**
 * Event DTO for USERS_DEBTOR_USER_CREATED event
 *
 * Received from api-users when a single debtor user is created.
 * Used to validate event payload before linking userId to debtor identity.
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
