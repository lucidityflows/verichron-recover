/**
 * Published when a portfolio is assigned to a team.
 */
export interface PortfolioAssignedToTeamPayload {
  organizationId: string;
  portfolioId: string;
  teamId: string;
  assignedAt: string;
}
