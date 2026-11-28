import { IsUUID, IsEmail, IsString, IsArray, ValidateNested, IsInt, Min, IsDateString, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { DebtorUserCreatedBatchPayload, DebtorUserMapping } from '@verichron/events';
import { UserStatus } from '@verichron/enums';

/**
 * User status enum for debtor users
 */
// enum UserStatus {
//   PROVISIONAL = 'PROVISIONAL',
//   ACTIVE = 'ACTIVE',
// }

/**
 * DTO for debtor user mapping
 */
export class DebtorUserMappingDto implements DebtorUserMapping {
  @IsUUID()
  debtorIdentityId: string;

  @IsUUID()
  userId: string;

  @IsEmail()
  email: string;

  @IsEnum(UserStatus)
  status: UserStatus.PROVISIONAL | UserStatus.ACTIVE;

  @IsBoolean()
  isNewUser: boolean;

  @IsString()
  @IsOptional()
  invitationToken?: string;

  @IsDateString()
  @IsOptional()
  invitationExpiresAt?: string;
}

/**
 * Event DTO for DebtorUserCreatedBatch event
 *
 * Published by api-users after processing debtor invitation batch.
 * Consumed by api-debtors to link userIds to debtor identities.
 * Implements DebtorUserCreatedBatchPayload from @verichron/events for type safety.
 */
export class DebtorUserCreatedBatchDto implements DebtorUserCreatedBatchPayload {
  @IsUUID()
  invitationBatchId: string;

  @IsUUID()
  organizationId: string;

  @IsInt()
  @Min(1)
  batchNumber: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtorUserMappingDto)
  userMappings: DebtorUserMappingDto[];

  @IsDateString()
  createdAt: string;
}
