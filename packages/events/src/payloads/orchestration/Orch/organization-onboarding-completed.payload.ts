/*
* Payload for ORGANIZATIONS_ONBOARDING_COMPLETED event
 * Published by the OnboardingOrchestrator when an organization has been successfully onboarded.
 */

export interface OrganizationOnboardingCompletedPayload {
  organizationId: string;
  organizationName: string;
  initialAdminUserId: string;
  initialAdminEmail: string;
  onboardedAt: string;
}
