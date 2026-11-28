import { OrganizationType } from '@verichron/enums';
import { OrganizationOnboardingRequestedPayload } from '@verichron/events';
import { IsString, IsEmail, IsUUID, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AdminUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}

/**
 * DTO for ORGANIZATIONS_ONBOARDING_REQUESTED event
 *
 * Published by api-organizations to trigger the onboarding workflow.
 * Validated by event-orchestrator before processing.
 */
export class OrganizationOnboardingRequestedDto implements OrganizationOnboardingRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  organizationName: string;

  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @ValidateNested()
  @Type(() => AdminUserDto)
  adminUser: AdminUserDto;

  @IsUUID()
  @IsOptional()
  createdBy?: string;
}
