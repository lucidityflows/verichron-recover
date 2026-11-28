/**
 * Bankruptcy Chapter Enum
 *
 * Represents the type of bankruptcy filing under U.S. Bankruptcy Code.
 *
 * FDCPA COMPLIANCE:
 * - Collection MUST cease immediately upon notification of bankruptcy filing
 * - Automatic stay applies to all collection activities
 * - Creditors must file proof of claim with bankruptcy court
 * - Violations can result in sanctions and debtor damages
 *
 * CHAPTER DIFFERENCES:
 *
 * CHAPTER_7 (Liquidation):
 * - Individual/business liquidates assets to pay creditors
 * - Unsecured debts typically discharged
 * - Duration: ~4-6 months
 * - Collection impact: HIGH (most debts discharged)
 *
 * CHAPTER_11 (Reorganization - Business):
 * - Business continues operating while restructuring debt
 * - Repayment plan must be approved by creditors/court
 * - Duration: Months to years
 * - Collection impact: MEDIUM (debt restructured, some recovery possible)
 *
 * CHAPTER_13 (Wage Earner Plan):
 * - Individual with regular income repays debts over 3-5 years
 * - Debtor keeps assets while making plan payments
 * - Duration: 3-5 years
 * - Collection impact: MEDIUM (structured payments, partial discharge after completion)
 */
export enum BankruptcyChapter {
  /**
   * Chapter 7: Liquidation bankruptcy
   * Debtor's non-exempt assets sold to pay creditors
   * Most common for individuals
   */
  CHAPTER_7 = 'CHAPTER_7',

  /**
   * Chapter 11: Business reorganization
   * Company continues operating while restructuring debt
   * Rare for individuals (usually high-net-worth)
   */
  CHAPTER_11 = 'CHAPTER_11',

  /**
   * Chapter 13: Wage earner repayment plan
   * Individual repays debts over 3-5 years from income
   * Allows keeping assets while catching up on secured debts
   */
  CHAPTER_13 = 'CHAPTER_13',
}
