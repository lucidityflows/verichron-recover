/**
 * Published when a member is removed from a team.
 */
export interface TeamMemberRemovedPayload {
  teamId: string;
  organizationId: string;
  userId: string;
  removedAt: string;
}
