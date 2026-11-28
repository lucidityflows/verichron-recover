/**
 * Payload for ORGANIZATIONS_ONBOARDING_FAILED event
 * Published by the OnboardingOrchestrator when an organization onboarding has failed.
 */

export interface OrganizationOnboardingFailedPayload {
  organizationId: string;
  error: string;
  failedAt: string;
}
