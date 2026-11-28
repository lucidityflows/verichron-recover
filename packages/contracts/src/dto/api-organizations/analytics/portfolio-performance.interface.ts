import { DebtCategory } from '@verichron/enums';

/**
 * Individual portfolio performance data
 *
 * CURRENCY FIELD RATIONALE:
 * Currency amounts (purchasePrice, totalPrincipal, totalCollected) are strings, not numbers.
 *
 * Why strings?
 * 1. Precision: JavaScript numbers use IEEE 754 floating point, which causes precision errors
 *    (e.g., 0.1 + 0.2 = 0.30000000000004). Strings preserve exact decimal values.
 *
 * 2. Database consistency: PostgreSQL stores currency as DECIMAL(12,2), and TypeORM returns
 *    these as strings to avoid precision loss during serialization.
 *
 * 3. Pattern consistency: Matches Recovery Trends and all other analytics endpoints where
 *    raw currency = string, calculated percentages = number.
 *
 * 4. Entity alignment: Debt and Portfolio entities define currency fields as strings:
 *    @Column({ type: 'decimal', precision: 12, scale: 2 })
 *    principalAmount: string;
 *
 * Frontend can easily parse for display: parseFloat(amount).toLocaleString('en-US', {style: 'currency'})
 */
export interface IPortfolioPerformance {
  /** Portfolio unique identifier */
  portfolioId: string;

  /** Portfolio name */
  portfolioName: string;

  /**
   * Purchase price (amount invested) as decimal string
   * Example: "125000.00"
   * @see CURRENCY FIELD RATIONALE above
   */
  purchasePrice: string;

  /**
   * Total principal amount of all debts as decimal string
   * Example: "450000.00"
   * @see CURRENCY FIELD RATIONALE above
   */
  totalPrincipal: string;

  /**
   * Total amount collected as decimal string
   * Example: "180000.00"
   * @see CURRENCY FIELD RATIONALE above
   */
  totalCollected: string;

  /**
   * Recovery rate percentage (0-100)
   * Calculated: (totalCollected / totalPrincipal) * 100
   * Example: 40.0 means 40% recovery rate
   */
  recoveryRate: number;

  /**
   * Return on investment percentage
   * Calculated: ((totalCollected - purchasePrice) / purchasePrice) * 100
   * Example: 44.0 means 44% ROI
   */
  roi: number;

  /** Total number of debts in portfolio */
  debtCount: number;

  /** Number of active debts */
  activeDebts: number;

  /** Number of paid debts */
  paidDebts: number;

  /** Number of payment plans */
  paymentPlanCount: number;

  /**
   * Average days from debt creation to first payment
   * Null if no payments have been made
   */
  avgDaysToFirstPayment: number | null;

  /**
   * Primary debt category in portfolio (if applicable)
   * Determined by majority debt category in the portfolio
   */
  primaryDebtCategory?: DebtCategory;

  /** Portfolio tags for filtering and categorization */
  portfolioTags: string[];
}
