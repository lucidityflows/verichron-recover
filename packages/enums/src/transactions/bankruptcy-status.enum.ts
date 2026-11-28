/**
 * Bankruptcy Status Enum
 *
 * Tracks the lifecycle of a bankruptcy case from filing through resolution.
 *
 * LIFECYCLE FLOW:
 * 1. FILED → Initial bankruptcy petition filed with court
 * 2. PENDING → Case active, automatic stay in effect, awaiting resolution
 * 3. DISCHARGED → Debts legally discharged, case closed (debtor wins)
 * 4. DISMISSED → Case dismissed without discharge (creditor can resume collection)
 * 5. CONVERTED → Case converted to different chapter (e.g., 13→7)
 *
 * COLLECTION RULES:
 * - FILED/PENDING: STOP all collection immediately (automatic stay)
 * - DISCHARGED: STOP permanently (debt legally eliminated)
 * - DISMISSED: RESUME collection (case failed, debt remains)
 * - CONVERTED: STOP (still under bankruptcy protection)
 *
 * ANALYTICS USAGE:
 * - Discharge rate: (DISCHARGED / (DISCHARGED + DISMISSED)) * 100
 * - Average time to discharge: Days from FILED to DISCHARGED
 * - Conversion rate: (CONVERTED / total filings) * 100
 */
export enum BankruptcyStatus {
  /**
   * Bankruptcy petition filed with court.
   * Automatic stay begins - collection MUST stop.
   */
  FILED = 'FILED',

  /**
   * Case is active and pending court decision.
   * Automatic stay in effect - collection MUST stop.
   * Awaiting 341 meeting, trustee review, or plan confirmation.
   */
  PENDING = 'PENDING',

  /**
   * Debts discharged by court order.
   * Collection PERMANENTLY prohibited on discharged debts.
   * Case closed.
   */
  DISCHARGED = 'DISCHARGED',

  /**
   * Case dismissed without discharge.
   * Automatic stay lifted - collection CAN resume.
   * Debt remains valid and collectible.
   */
  DISMISSED = 'DISMISSED',

  /**
   * Case converted to different chapter.
   * E.g., Chapter 13 converted to Chapter 7.
   * Automatic stay remains - collection MUST stop.
   * New BankruptcyFiling record should be created for converted case.
   */
  CONVERTED = 'CONVERTED',
}
