/**
 * Payload for PortfolioSold event
 *
 * **CRITICAL EVENT** - Triggers cascading ownership transfer workflow
 *
 * Published when a portfolio is sold/transferred to another organization.
 * This triggers:
 * 1. Update organizationId on all debts in the portfolio
 * 2. Create debt_ownership_history records for audit trail
 * 3. Clear user_portfolio_permission records (old org users lose access)
 *
 * This is one of the most important events in the system for compliance
 * and legal defensibility (chain of title).
 */
export interface PortfolioSoldPayload {
  portfolioId: string;
  previousOrganizationId: string;
  newOrganizationId: string;
  transferDate: string; // ISO 8601 date string
  transferPrice?: string; // Decimal as string, optional
  notes?: string;
  soldBy: string;
  soldAt: string; // ISO 8601 timestamp
}
