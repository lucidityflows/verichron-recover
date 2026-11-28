/**
 * Published when a team is updated.
 */
export interface TeamUpdatedPayload {
  teamId: string;
  organizationId: string;
  name: string;
  managerUserId?: string;
  updatedAt: string;
}
