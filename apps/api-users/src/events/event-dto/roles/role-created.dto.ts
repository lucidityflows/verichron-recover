
import { RoleCreatedPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class RoleCreatedDto implements RoleCreatedPayload {
  @IsUUID()
  roleId: string;

  @IsUUID()
  @IsOptional()
  organizationId: string | null;

  @IsString()
  roleName: string;

  @IsBoolean()
  isSystemRole: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permissionIds?: string[];

  @IsUUID()
  @IsOptional()
  createdBy?: string;
}
