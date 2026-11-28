/**
 * Payload for PortfolioImportStarted event
 *
 * Published when a portfolio import begins, signaling that debtor processing
 * should start. Contains all debtor data extracted from the import file.
 */
export interface PortfolioImportStartedPayload {
  /** Import job identifier from api-debts */
  importJobId: string;

  /** Portfolio being imported */
  portfolioId: string;

  /** Organization importing the portfolio */
  organizationId: string;

  /** Portfolio name */
  portfolioName: string;

  /** Total number of debtors to process */
  totalDebtors: number;

  /** Timestamp when import started */
  importedAt: string;
}
