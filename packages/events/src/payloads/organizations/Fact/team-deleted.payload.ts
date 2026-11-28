/**
 * Published when a team is deleted.
 */
export interface TeamDeletedPayload {
  teamId: string;
  organizationId: string;
  deletedAt: string;
}
