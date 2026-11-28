import { OrganizationStatusUpdatedPayload } from '@verichron/events';
import { OrganizationStatus } from '@verichron/enums';
import { IsString, IsUUID, IsOptional, IsEnum, IsDateString, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

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

export class OrganizationStatusChangedDto implements OrganizationStatusUpdatedPayload {
  @IsUUID()
  organizationId: string;

  @IsEnum(OrganizationStatus)
  previousStatus: OrganizationStatus;

  @IsEnum(OrganizationStatus)
  newStatus: OrganizationStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsUUID()
  updatedBy: string;

  @ValidateNested()
  @Type(() => ActorSnapshotDto)
  actor: ActorSnapshotDto;

  @IsDateString()
  statusChangedAt: string;
}