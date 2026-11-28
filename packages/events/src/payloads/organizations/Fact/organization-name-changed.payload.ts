/**
 * Published when organization name changes.
 */
export interface OrganizationNameChangedPayload {
  organizationId: string;
  previousName: string;
  newName: string;
  changedAt: string;
  updatedBy: string;
}
