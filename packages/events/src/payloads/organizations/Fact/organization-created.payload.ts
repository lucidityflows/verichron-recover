import { OrganizationType } from "@verichron/enums";

/**
 * Published when a new organization is successfully created and activated.
 */
export interface OrganizationCreatedPayload {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  
  /**
   * Initial admin user details for automatic provisioning.
   */
  adminUser: {
    email: string;
    firstName: string;
    lastName: string;
  };
  
  /**
   * ID of the platform admin who initiated onboarding.
   */
  createdBy?: string;
  createdAt?: string;
}