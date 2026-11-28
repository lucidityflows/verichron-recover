import { OrganizationOnboardingFailedPayload } from '@verichron/events';
import { IsString, IsUUID, IsDateString } from 'class-validator';

/**
 * DTO for ORGANIZATIONS_ONBOARDING_FAILED event
 *
 * Published by the OnboardingOrchestrator when an organization onboarding has failed.
 * Validated by api-organizations when received.
 */
export class OrganizationOnboardingFailedDto implements OrganizationOnboardingFailedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  error: string;

  @IsDateString()
  failedAt: string;
}
