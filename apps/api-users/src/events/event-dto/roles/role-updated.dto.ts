
import { RoleUpdatedPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsDateString, IsArray } from 'class-validator';

export class RoleUpdatedDto implements RoleUpdatedPayload {
  @IsUUID()
  roleId: string;

  @IsUUID()
  organizationId: string;

  @IsArray()
  @IsString({ each: true })
  updatedFields: string[];

  @IsDateString()
  updatedAt: string;

  @IsUUID()
  @IsOptional()
  updatedBy?: string;
}
