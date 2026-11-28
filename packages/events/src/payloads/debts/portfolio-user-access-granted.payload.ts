/**
 * Payload for PortfolioUserAccessGranted event
 *
 * Published when a user is granted access to a portfolio (Layer 2 authorization).
 * This creates a user_portfolio_permission record, allowing the user to
 * work on all debts within this portfolio.
 */
export interface PortfolioUserAccessGrantedPayload {
  portfolioId: string;
  organizationId: string;
  userId: string;
  grantedBy?: string; // User who granted the access
  grantedAt: string;
}
