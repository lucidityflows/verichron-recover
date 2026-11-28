
import { RoleAssignedPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class RoleAssignedDto implements RoleAssignedPayload {
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
  assignedAt: string;

  @IsUUID()
  @IsOptional()
  assignedBy?: string;
}
