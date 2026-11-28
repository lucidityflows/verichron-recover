/**
 * Published when organization is updated.
 */
export interface OrganizationUpdatedPayload {
  organizationId: string;
  updatedFields: string[];
  updatedAt: string;
  updatedBy: string;
}
