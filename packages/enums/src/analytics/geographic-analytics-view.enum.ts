/**
 * Geographic analytics view types
 * Determines which type of geographic analytics data is being displayed
 */
export enum GeographicAnalyticsView {
  /**
   * Debtor location analytics - shows debt metrics grouped by debtor state
   */
  DEBTORS = 'debtors',

  /**
   * Creditor location analytics - shows debt metrics grouped by original creditor state
   */
  CREDITORS = 'creditors',

  /**
   * Combined view - shows geographic flows from creditor states to debtor states
   */
  COMBINED = 'combined',

  /**
   * Payment plan engagement by debtor state
   */
  PAYMENT_PLANS = 'payment-plans',

  /**
   * Debtor responsiveness metrics by state
   */
  RESPONSIVENESS = 'responsiveness',

  /**
   * Likelihood to pay scores by state
   */
  LIKELIHOOD_TO_PAY = 'likelihood-to-pay',

  /**
   * Default risk scores by state
   */
  DEFAULT_RISK = 'default-risk',

  /**
   * Debt age distribution by state
   */
  DEBT_AGE = 'debt-age',
}
