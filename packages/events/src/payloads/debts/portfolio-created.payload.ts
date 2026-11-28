import { PortfolioStatus } from '@verichron/enums';

/**
 * Payload for PortfolioCreated event
 *
 * Published when a new portfolio is created.
 * Typically triggered during bulk import workflow.
 */
export interface PortfolioCreatedPayload {
  portfolioId: string;
  organizationId: string;
  name: string;
  status: PortfolioStatus;
  purchaseDate: string; // ISO 8601 date string
  purchasePrice: string; // Decimal as string
  totalPrincipal: string; // Decimal as string
  source: string;
  createdBy: string;
  createdAt: string;
}
