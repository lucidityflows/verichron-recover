import { PortfolioStatus } from "@verichron/enums";

/**
 * Contract for creating a new portfolio record.
 *
 * Represents the data required to create a debt portfolio in the system.
 */
export interface ICreatePortfolio {
  /**
   * Portfolio name/identifier
   */
  name: string;

  /**
   * Date when portfolio was acquired (ISO 8601 date string)
   */
  purchaseDate: string;

  /**
   * Amount paid to acquire the portfolio
   */
  purchasePrice: number;

  /**
   * Total principal of all debts in portfolio
   */
  totalPrincipal: number;

  /**
   * Source/origin of the portfolio (e.g., creditor name, auction, etc.)
   */
  source: string;

  /**
   * Initial status (optional, defaults to PROVISIONING)
   */
  status?: PortfolioStatus;
}
