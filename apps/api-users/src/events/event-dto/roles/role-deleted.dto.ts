
import { RoleDeletedPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class RoleDeletedDto implements RoleDeletedPayload {
  @IsUUID()
  roleId: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  roleName: string;

  @IsDateString()
  deletedAt: string;

  @IsUUID()
  @IsOptional()
  deletedBy?: string;
}
