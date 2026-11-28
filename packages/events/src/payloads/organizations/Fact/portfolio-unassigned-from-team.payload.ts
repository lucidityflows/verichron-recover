/**
 * Published when a portfolio is unassigned from a team.
 */
export interface PortfolioUnassignedFromTeamPayload {
  organizationId: string;
  portfolioId: string;
  teamId: string;
  unassignedAt: string;
}
