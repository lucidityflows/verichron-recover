
import { OrganizationReactivatedPayload } from '@verichron/events';
import { OrganizationType } from '@verichron/enums';
import { IsString, IsUUID, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class OrganizationReactivatedDto implements OrganizationReactivatedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  organizationName: string;

  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @IsString()
  @IsOptional()
  note?: string;

  @IsDateString()
  reactivatedAt: string;

  @IsUUID()
  @IsOptional()
  reactivatedBy?: string;
}
