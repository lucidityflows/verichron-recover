import { TeamMemberRole } from "@verichron/enums";

/**
 * Published when a member is added to a team.
 */
export interface TeamMemberAddedPayload {
  teamId: string;
  organizationId: string;
  userId: string;
  roleOnTeam: TeamMemberRole;
  isPrimary: boolean;
  addedAt: string;
}
