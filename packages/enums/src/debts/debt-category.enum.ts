/**
 * DebtCategory Enum
 *
 * Canonical classification of debt types at the debt level.
 * This is the intrinsic property of the debt (e.g., a credit card debt is always a credit card debt).
 *
 * Design Rationale:
 * - Debt-level classification (not portfolio-level) because portfolios can be mixed
 * - Enables analytics by debt type regardless of portfolio grouping
 * - Supports queries like "Show all medical debts across all portfolios"
 * - Allows filtering in geographic analytics and recovery trends
 *
 * Usage:
 * - Set on debt creation/import
 * - Required field with default of OTHER
 * - Used for analytics filtering and reporting
 */
export enum DebtCategory {
  /** Credit card debt from banks and credit issuers */
  CREDIT_CARD = 'CREDIT_CARD',

  /** Auto loans and vehicle financing */
  AUTO_LOAN = 'AUTO_LOAN',

  /** Medical bills and healthcare debts */
  MEDICAL = 'MEDICAL',

  /** Student loans and educational financing */
  STUDENT_LOAN = 'STUDENT_LOAN',

  /** Personal loans and unsecured consumer debt */
  PERSONAL_LOAN = 'PERSONAL_LOAN',

  /** Utility bills (electric, water, gas, etc.) */
  UTILITY = 'UTILITY',

  /** Telecom bills (phone, internet, cable) */
  TELECOM = 'TELECOM',

  /** Home mortgages and real estate loans */
  MORTGAGE = 'MORTGAGE',

  /** Payday loans and short-term high-interest loans */
  PAYDAY_LOAN = 'PAYDAY_LOAN',

  /** Uncategorized or miscellaneous debt */
  OTHER = 'OTHER',
}
