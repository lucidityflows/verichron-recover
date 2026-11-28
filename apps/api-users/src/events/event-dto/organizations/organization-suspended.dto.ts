
import { OrganizationSuspendedPayload } from '@verichron/events';
import { OrganizationType } from '@verichron/enums';
import { IsString, IsUUID, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class OrganizationSuspendedDto implements OrganizationSuspendedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  organizationName: string;

  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @IsString()
  reason: string;

  @IsDateString()
  suspendedAt: string;

  @IsUUID()
  @IsOptional()
  suspendedBy?: string;
}
