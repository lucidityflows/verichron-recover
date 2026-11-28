/**
 * Payload for PortfolioImportCompleted event
 *
 * Published when a portfolio import (with debts) completes successfully.
 * Indicates that a portfolio and all its debts have been created and persisted.
 */
export interface PortfolioImportCompletedPayload {
  portfolioId: string;
  organizationId: string;
  portfolioName: string;
  debtsCreated: number;
  totalPrincipal: string; // Decimal as string
  purchasePrice: string; // Decimal as string
  source: string;
  parseMethod: string; // 'csv', 'ai', 'manual', etc.
  fileName?: string;
  importedBy: string;
  importedAt: string;
}
