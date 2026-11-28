
import { UserProfileUpdatedPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsDateString, IsArray } from 'class-validator';

export class UserProfileUpdatedDto implements UserProfileUpdatedPayload {
  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  organizationId: string | null;

  @IsArray()
  @IsString({ each: true })
  updatedFields: string[];

  @IsDateString()
  updatedAt: string;

  @IsUUID()
  @IsOptional()
  updatedBy?: string;
}
