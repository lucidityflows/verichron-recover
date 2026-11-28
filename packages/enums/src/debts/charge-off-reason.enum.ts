/**
 * Charge-Off Reason Enum
 *
 * Categorizes why a debt was charged off (written off as a loss) by the creditor.
 *
 * ACCOUNTING CONTEXT:
 * - Charge-off = creditor writes off debt as uncollectible for accounting purposes
 * - Does NOT mean debt is forgiven or uncollectible legally
 * - Often occurs at 180 days past due (per federal regulations)
 * - Creditor can still attempt collection or sell debt to collection agency
 *
 * REASONS:
 *
 * DELINQUENCY_180_DAYS:
 * - Standard charge-off at 180 days past due
 * - Most common reason for consumer debts
 * - Regulatory requirement for banks
 *
 * BANKRUPTCY:
 * - Debtor filed bankruptcy
 * - Debt likely to be discharged
 * - Must be written off for accounting purposes
 *
 * DECEASED:
 * - Debtor confirmed deceased
 * - No estate or estate insufficient to pay debt
 * - Written off as uncollectible
 *
 * FRAUD_IDENTITY_THEFT:
 * - Debt determined to be result of fraud/identity theft
 * - Not debtor's actual obligation
 * - Written off and removed from debtor's record
 *
 * STATUTE_OF_LIMITATIONS:
 * - Debt aged beyond statute of limitations
 * - Legally uncollectible
 * - Written off but may remain on credit report
 *
 * SETTLEMENT_WRITE_OFF:
 * - Debt settled for less than full balance
 * - Remaining balance written off
 * - Partial recovery achieved
 *
 * UNCOLLECTIBLE:
 * - Debtor has no assets or income
 * - Collection attempts exhausted
 * - Written off as bad debt
 *
 * DISPUTE_RESOLVED_DEBTOR_FAVOR:
 * - Debtor successfully disputed debt
 * - Verification failed or debt invalid
 * - Written off and removed
 *
 * OTHER:
 * - Miscellaneous reasons not covered above
 * - Requires notes field for explanation
 */
export enum ChargeOffReason {
  /**
   * Standard charge-off after 180 days delinquent.
   * Per federal banking regulations.
   */
  DELINQUENCY_180_DAYS = 'DELINQUENCY_180_DAYS',

  /**
   * Debtor filed bankruptcy.
   * Debt included in bankruptcy proceedings.
   */
  BANKRUPTCY = 'BANKRUPTCY',

  /**
   * Debtor deceased, no estate recovery possible.
   */
  DECEASED = 'DECEASED',

  /**
   * Debt resulted from fraud or identity theft.
   * Not debtor's actual obligation.
   */
  FRAUD_IDENTITY_THEFT = 'FRAUD_IDENTITY_THEFT',

  /**
   * Debt aged beyond statute of limitations.
   * Legally uncollectible.
   */
  STATUTE_OF_LIMITATIONS = 'STATUTE_OF_LIMITATIONS',

  /**
   * Debt settled for partial payment.
   * Remaining balance written off.
   */
  SETTLEMENT_WRITE_OFF = 'SETTLEMENT_WRITE_OFF',

  /**
   * Debtor has no collectible assets/income.
   * All collection attempts exhausted.
   */
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',

  /**
   * Debt dispute resolved in debtor's favor.
   * Debt invalid or unverifiable.
   */
  DISPUTE_RESOLVED_DEBTOR_FAVOR = 'DISPUTE_RESOLVED_DEBTOR_FAVOR',

  /**
   * Other reason not categorized above.
   * See notes field for details.
   */
  OTHER = 'OTHER',
}
