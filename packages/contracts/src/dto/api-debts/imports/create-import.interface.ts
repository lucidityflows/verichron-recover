/**
 * Contract interface for creating a new import job.
 *
 * This is submitted along with the CSV file upload to initiate
 * a bulk portfolio import.
 */
export interface ICreateImport {
  /**
   * Name for the portfolio to be created from this import
   */
  portfolioName: string;

  /**
   * Date the portfolio was acquired/purchased (ISO 8601 date string YYYY-MM-DD)
   */
  purchaseDate: string;

  /**
   * Amount paid to acquire this portfolio in USD
   */
  purchasePrice: number;

  /**
   * Origin/source of the portfolio (e.g., creditor name, acquisition details)
   */
  source: string;
}
