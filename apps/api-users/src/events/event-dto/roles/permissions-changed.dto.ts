
import { PermissionsChangedPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsDateString, IsArray } from 'class-validator';

export class PermissionsChangedDto implements PermissionsChangedPayload {
  @IsUUID()
  roleId: string;

  @IsUUID()
  organizationId: string;

  @IsArray()
  @IsString({ each: true })
  addedPermissions: string[];

  @IsArray()
  @IsString({ each: true })
  removedPermissions: string[];

  @IsDateString()
  changedAt: string;

  @IsUUID()
  @IsOptional()
  changedBy?: string;
}
