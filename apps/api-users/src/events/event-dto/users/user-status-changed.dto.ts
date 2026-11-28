
import { UserStatusChangedPayload } from '@verichron/events';
import { UserStatus } from '@verichron/enums';
import { IsString, IsUUID, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class UserStatusChangedDto implements UserStatusChangedPayload {
  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  organizationId: string | null;

  @IsEnum(UserStatus)
  oldStatus: string;

  @IsEnum(UserStatus)
  newStatus: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsDateString()
  statusChangedAt: string;

  @IsUUID()
  @IsOptional()
  changedBy?: string;
}
