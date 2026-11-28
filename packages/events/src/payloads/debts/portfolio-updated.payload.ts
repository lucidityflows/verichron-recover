import { PortfolioStatus } from '@verichron/enums';

/**
 * Payload for PortfolioUpdated event
 *
 * Published when portfolio properties are updated.
 * This is a catch-all event for property modifications.
 */
export interface PortfolioUpdatedPayload {
  portfolioId: string;
  organizationId: string;
  updatedBy: string;
  updatedAt: string;
  // Optional fields that might have been updated
  name?: string;
  purchaseDate?: string;
  purchasePrice?: string;
  totalPrincipal?: string;
  source?: string;
  status?: PortfolioStatus;
}
