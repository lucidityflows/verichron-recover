/**
 * Payload for PortfolioUserAccessRevoked event
 *
 * Published when a user's access to a portfolio is revoked.
 * This deletes the user_portfolio_permission record, preventing the user
 * from accessing debts in this portfolio.
 */
export interface PortfolioUserAccessRevokedPayload {
  portfolioId: string;
  organizationId: string;
  userId: string;
  revokedBy?: string; // User who revoked the access
  revokedAt: string;
}
