
import { RoleUnassignedPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class RoleUnassignedDto implements RoleUnassignedPayload {
  @IsUUID()
  userId: string;

  @IsUUID()
  roleId: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  roleName: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsDateString()
  unassignedAt: string;

  @IsUUID()
  @IsOptional()
  unassignedBy?: string;
}
