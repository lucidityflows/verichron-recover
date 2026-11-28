
import { UserDeletedPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class UserDeletedDto implements UserDeletedPayload {
  @IsUUID()
  userId: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsDateString()
  deletedAt: string;

  @IsUUID()
  @IsOptional()
  deletedBy?: string;
}
