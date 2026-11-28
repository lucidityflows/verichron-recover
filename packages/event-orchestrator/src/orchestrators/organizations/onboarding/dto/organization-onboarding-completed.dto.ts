import { OrganizationOnboardingCompletedPayload } from '@verichron/events';
import { IsString, IsUUID, IsDateString } from 'class-validator';

/**
 * DTO for ORGANIZATIONS_ONBOARDING_COMPLETED event
 *
 * Published by the OnboardingOrchestrator when an organization has been successfully onboarded.
 * Validated by api-organizations when received.
 */
export class OrganizationOnboardingCompletedDto implements OrganizationOnboardingCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  organizationName: string;

  @IsUUID()
  initialAdminUserId: string;

  @IsString()
  initialAdminEmail: string;

  @IsDateString()
  onboardedAt: string;
}
