import { OrganizationType } from '@verichron/enums';

/**
 * Payload for ORGANIZATIONS_ONBOARDING_REQUESTED event
 * Published by api-organizations to trigger the onboarding workflow.
 */
export interface OrganizationOnboardingRequestedPayload {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  adminUser: {
    email: string;
    firstName: string;
    lastName: string;
  };
  createdBy?: string;
}