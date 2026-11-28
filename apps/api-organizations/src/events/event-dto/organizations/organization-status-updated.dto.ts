import { IsUUID, IsString, IsNotEmpty, IsEnum, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrganizationStatus } from '@verichron/enums';
import { OrganizationStatusUpdatedPayload } from '@verichron/events';

class ActorSnapshotDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  role?: string;
}

export class OrganizationStatusUpdatedDto implements OrganizationStatusUpdatedPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsEnum(OrganizationStatus)
  previousStatus: OrganizationStatus;

  @IsEnum(OrganizationStatus)
  newStatus: OrganizationStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsUUID()
  @IsNotEmpty()
  updatedBy: string;

  @ValidateNested()
  @Type(() => ActorSnapshotDto)
  actor: ActorSnapshotDto;

  @IsDateString()
  @IsNotEmpty()
  statusChangedAt: string;
}