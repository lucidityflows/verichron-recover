/**
 * Published when a new team is created.
 */
export interface TeamCreatedPayload {
  teamId: string;
  organizationId: string;
  name: string;
  managerUserId?: string;
  createdAt: string;
}
