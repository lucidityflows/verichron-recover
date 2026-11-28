import { PortfolioStatus } from '@verichron/enums';

/**
 * Payload for PortfolioStatusChanged event
 *
 * Published when portfolio status transitions through its lifecycle.
 * Significant workflow state changes: PROVISIONING → ACTIVE → SOLD/CLOSED
 */
export interface PortfolioStatusChangedPayload {
  portfolioId: string;
  organizationId: string;
  oldStatus: PortfolioStatus;
  newStatus: PortfolioStatus;
  updatedBy: string;
  updatedAt: string;
}
