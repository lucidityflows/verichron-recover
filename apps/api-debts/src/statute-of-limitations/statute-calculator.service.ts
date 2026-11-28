import { Injectable, Logger } from '@nestjs/common';
import { DebtCategory } from '@verichron/enums';

/**
 * State-specific statute of limitations configuration
 * Periods are in YEARS
 *
 * Contract types:
 * - writtenContract: Debts with signed written agreement (auto loans, mortgages, personal loans)
 * - oralContract: Debts based on verbal agreement (rare in modern collection)
 * - openAccount: Revolving credit accounts (credit cards, store cards)
 * - promissoryNote: Written promise to pay specific amount by specific date
 *
 * LEGAL DISCLAIMER:
 * This calculator provides advisory information only and is NOT legal advice.
 * Statute of limitations varies by:
 * - State law (debtor residence, creditor state, transaction location)
 * - Debt type and original contract terms
 * - Debtor actions (payments can restart SOL in some states)
 * - Court interpretations and recent case law
 *
 * ALWAYS consult legal counsel before relying on SOL calculations for collection decisions.
 */
interface StatuteLimitsConfig {
  writtenContract: number; // years
  oralContract: number; // years
  openAccount: number; // years - credit cards, store cards
  promissoryNote?: number; // years - if different from written contract
}

/**
 * Statute of Limitations Calculator Service
 *
 * Calculates the date when the statute of limitations expires for a debt,
 * after which the creditor cannot legally sue to collect the debt.
 *
 * KEY CONCEPTS:
 *
 * 1. SOL does NOT eliminate the debt
 *    - Debt remains valid and owed
 *    - Creditor cannot sue after SOL expires
 *    - Debtor can still voluntarily pay
 *    - Collectors can still request payment (but must disclose SOL status if asked)
 *
 * 2. SOL period starts from date of first delinquency
 *    - The date of last payment OR
 *    - The date of first missed payment OR
 *    - The date of charge-off (if earlier)
 *
 * 3. Actions that CAN restart SOL (state-dependent):
 *    - Making a payment (even $1 in some states)
 *    - Written acknowledgment of debt
 *    - Entering into payment plan
 *    - Making a promise to pay
 *
 * 4. Actions that DO NOT restart SOL:
 *    - Being contacted by collector
 *    - Disputing the debt
 *    - Requesting validation
 *    - Credit report updates
 *
 * COMPLIANCE WARNINGS:
 * - Suing on time-barred debt is ILLEGAL in many states
 * - Some states require disclosure if debt is past SOL
 * - FDCPA violations possible if misrepresenting SOL status
 * - State-specific consumer protection laws may apply
 *
 * IMPLEMENTATION NOTES:
 * - This service calculates based on firstDelinquencyDate
 * - Does NOT account for SOL restart events (requires legal review)
 * - Provides conservative estimates
 * - UI should display "Advisory Only - Consult Legal" disclaimer
 */
@Injectable()
export class StatuteCalculatorService {
  private readonly logger = new Logger(StatuteCalculatorService.name);

  /**
   * State-specific statute of limitations periods (in years)
   * Source: Compiled from state statutes as of 2024
   * NOTE: These can change via legislation - review annually
   */
  private readonly statuteLimits: Record<string, StatuteLimitsConfig> = {
    // ========================================================================
    // STATES WITH 3-YEAR SOL (Shorter periods - more debtor-friendly)
    // ========================================================================
    LA: { writtenContract: 10, oralContract: 10, openAccount: 3 }, // Louisiana (unique civil law system)
    MS: { writtenContract: 3, oralContract: 3, openAccount: 3 }, // Mississippi
    NC: { writtenContract: 3, oralContract: 3, openAccount: 3 }, // North Carolina
    SC: { writtenContract: 3, oralContract: 3, openAccount: 3 }, // South Carolina
    TN: { writtenContract: 6, oralContract: 6, openAccount: 3 }, // Tennessee

    // ========================================================================
    // STATES WITH 4-YEAR SOL (Most common)
    // ========================================================================
    AL: { writtenContract: 6, oralContract: 6, openAccount: 3 }, // Alabama
    AK: { writtenContract: 3, oralContract: 3, openAccount: 3 }, // Alaska
    AZ: { writtenContract: 6, oralContract: 3, openAccount: 3 }, // Arizona
    AR: { writtenContract: 5, oralContract: 3, openAccount: 3 }, // Arkansas
    CA: { writtenContract: 4, oralContract: 2, openAccount: 4 }, // California
    CO: { writtenContract: 6, oralContract: 6, openAccount: 3 }, // Colorado
    CT: { writtenContract: 6, oralContract: 3, openAccount: 3 }, // Connecticut
    DE: { writtenContract: 3, oralContract: 3, openAccount: 3 }, // Delaware
    DC: { writtenContract: 3, oralContract: 3, openAccount: 3 }, // District of Columbia
    FL: { writtenContract: 5, oralContract: 4, openAccount: 4 }, // Florida
    GA: { writtenContract: 6, oralContract: 4, openAccount: 4 }, // Georgia
    HI: { writtenContract: 6, oralContract: 6, openAccount: 6 }, // Hawaii
    ID: { writtenContract: 5, oralContract: 4, openAccount: 4 }, // Idaho
    IL: { writtenContract: 10, oralContract: 5, openAccount: 5 }, // Illinois
    IN: { writtenContract: 10, oralContract: 6, openAccount: 6 }, // Indiana
    IA: { writtenContract: 10, oralContract: 5, openAccount: 5 }, // Iowa
    KS: { writtenContract: 5, oralContract: 3, openAccount: 3 }, // Kansas
    KY: { writtenContract: 15, oralContract: 5, openAccount: 5 }, // Kentucky
    ME: { writtenContract: 6, oralContract: 6, openAccount: 6 }, // Maine
    MD: { writtenContract: 3, oralContract: 3, openAccount: 3 }, // Maryland
    MA: { writtenContract: 6, oralContract: 6, openAccount: 6 }, // Massachusetts
    MI: { writtenContract: 6, oralContract: 6, openAccount: 6 }, // Michigan
    MN: { writtenContract: 6, oralContract: 6, openAccount: 6 }, // Minnesota
    MO: { writtenContract: 10, oralContract: 5, openAccount: 5 }, // Missouri
    MT: { writtenContract: 8, oralContract: 5, openAccount: 5 }, // Montana
    NE: { writtenContract: 5, oralContract: 4, openAccount: 4 }, // Nebraska
    NV: { writtenContract: 6, oralContract: 4, openAccount: 4 }, // Nevada
    NH: { writtenContract: 3, oralContract: 3, openAccount: 3 }, // New Hampshire
    NJ: { writtenContract: 6, oralContract: 6, openAccount: 6 }, // New Jersey
    NM: { writtenContract: 6, oralContract: 4, openAccount: 4 }, // New Mexico
    NY: { writtenContract: 6, oralContract: 6, openAccount: 6 }, // New York
    ND: { writtenContract: 6, oralContract: 6, openAccount: 6 }, // North Dakota
    OH: { writtenContract: 15, oralContract: 6, openAccount: 6 }, // Ohio
    OK: { writtenContract: 5, oralContract: 3, openAccount: 3 }, // Oklahoma
    OR: { writtenContract: 6, oralContract: 6, openAccount: 6 }, // Oregon
    PA: { writtenContract: 4, oralContract: 4, openAccount: 4 }, // Pennsylvania
    RI: { writtenContract: 10, oralContract: 10, openAccount: 10 }, // Rhode Island
    SD: { writtenContract: 6, oralContract: 6, openAccount: 6 }, // South Dakota
    TX: { writtenContract: 4, oralContract: 4, openAccount: 4 }, // Texas
    UT: { writtenContract: 6, oralContract: 4, openAccount: 4 }, // Utah
    VT: { writtenContract: 6, oralContract: 6, openAccount: 3 }, // Vermont
    VA: { writtenContract: 5, oralContract: 3, openAccount: 3 }, // Virginia
    WA: { writtenContract: 6, oralContract: 3, openAccount: 3 }, // Washington
    WV: { writtenContract: 10, oralContract: 5, openAccount: 5 }, // West Virginia
    WI: { writtenContract: 6, oralContract: 6, openAccount: 6 }, // Wisconsin
    WY: { writtenContract: 10, oralContract: 8, openAccount: 8 }, // Wyoming
  };

  /**
   * Calculate statute of limitations expiration date
   *
   * @param firstDelinquencyDate - Date debt first became delinquent (start of SOL period)
   * @param state - State whose SOL applies (2-letter code)
   * @param debtCategory - Type of debt (determines contract type)
   * @returns Expiration date or null if cannot calculate
   */
  calculateSOLDate(
    firstDelinquencyDate: Date | null,
    state: string | null,
    debtCategory: DebtCategory,
  ): Date | null {
    // Validation
    if (!firstDelinquencyDate || !state) {
      this.logger.warn(
        `Cannot calculate SOL: missing firstDelinquencyDate (${!!firstDelinquencyDate}) or state (${!!state})`,
      );
      return null;
    }

    const limits = this.statuteLimits[state.toUpperCase()];
    if (!limits) {
      this.logger.warn(`Unknown state for SOL calculation: ${state}`);
      return null;
    }

    // Determine contract type based on debt category
    const yearsToAdd = this.getSOLYearsForDebtCategory(limits, debtCategory);

    if (yearsToAdd === null) {
      this.logger.warn(
        `Could not determine SOL period for state ${state} and debtCategory ${debtCategory}`,
      );
      return null;
    }

    // Calculate expiration date
    const solDate = new Date(firstDelinquencyDate);
    solDate.setFullYear(solDate.getFullYear() + yearsToAdd);

    this.logger.debug(
      `Calculated SOL expiration: ${solDate.toISOString()} for state ${state}, category ${debtCategory} (${yearsToAdd} years)`,
    );

    return solDate;
  }

  /**
   * Determine SOL period in years based on debt category and state limits
   *
   * @param limits - State's SOL limits configuration
   * @param debtCategory - Type of debt
   * @returns Number of years until SOL expires, or null if cannot determine
   */
  private getSOLYearsForDebtCategory(
    limits: StatuteLimitsConfig,
    debtCategory: DebtCategory,
  ): number | null {
    switch (debtCategory) {
      // Credit cards and revolving credit = open account
      case DebtCategory.CREDIT_CARD:
        return limits.openAccount;

      // Medical and utility debts = typically open account (no signed contract)
      case DebtCategory.MEDICAL:
      case DebtCategory.UTILITY:
        return limits.openAccount;

      // Auto loans, mortgages, personal loans = written contract
      case DebtCategory.AUTO_LOAN:
      case DebtCategory.MORTGAGE:
      case DebtCategory.PERSONAL_LOAN:
        return limits.writtenContract;

      // Student loans - NOTE: Federal student loans have NO statute of limitations
      // Private student loans follow written contract SOL
      case DebtCategory.STUDENT_LOAN:
        this.logger.warn(
          'Student loan SOL calculation: Federal loans have no SOL. This calculation assumes private student loan.',
        );
        return limits.writtenContract;

      // Payday loans = written contract (even if brief)
      case DebtCategory.PAYDAY_LOAN:
        return limits.writtenContract;

      // Other/Unknown = use most conservative (longest) period to avoid premature write-offs
      case DebtCategory.OTHER:
      default:
        this.logger.warn(
          `Unknown debt category for SOL: ${debtCategory}. Using written contract SOL (most conservative).`,
        );
        return limits.writtenContract;
    }
  }

  /**
   * Determine which state's statute of limitations applies
   *
   * SOL state determination priority (varies by jurisdiction):
   * 1. Contract state (if specified in original agreement)
   * 2. Debtor's state of residence at time of delinquency
   * 3. Creditor's state (if debtor state unknown)
   * 4. Transaction state (where debt originated)
   *
   * LEGAL NOTE:
   * Choice-of-law rules are complex and fact-specific.
   * Some states have "borrowing statutes" that apply foreign SOL if shorter.
   * This is a simplified determination - consult legal counsel for certainty.
   *
   * @param debtorState - Debtor's state of residence
   * @param creditorState - Creditor's state
   * @param contractState - State specified in original contract (if any)
   * @returns State code to use for SOL calculation, or null if cannot determine
   */
  determineSOLState(
    debtorState: string | null,
    creditorState: string | null,
    contractState?: string | null,
  ): string | null {
    // Priority 1: Contract state (if valid)
    if (contractState && this.statuteLimits[contractState.toUpperCase()]) {
      return contractState.toUpperCase();
    }

    // Priority 2: Debtor state (most common)
    if (debtorState && this.statuteLimits[debtorState.toUpperCase()]) {
      return debtorState.toUpperCase();
    }

    // Priority 3: Creditor state (fallback)
    if (creditorState && this.statuteLimits[creditorState.toUpperCase()]) {
      return creditorState.toUpperCase();
    }

    this.logger.warn(
      `Cannot determine SOL state: contractState=${contractState}, debtorState=${debtorState}, creditorState=${creditorState}`,
    );
    return null;
  }

  /**
   * Check if a debt is currently past the statute of limitations
   *
   * @param statuteOfLimitationsDate - Calculated SOL expiration date
   * @returns True if debt is past SOL (time-barred), false if still within SOL or cannot determine
   */
  isDebtTimeBbarred(statuteOfLimitationsDate: Date | null): boolean {
    if (!statuteOfLimitationsDate) {
      // Cannot determine - assume NOT time-barred for safety
      return false;
    }

    const now = new Date();
    return now > statuteOfLimitationsDate;
  }

  /**
   * Get human-readable SOL status for UI display
   *
   * @param statuteOfLimitationsDate - Calculated SOL expiration date
   * @returns Status message for display
   */
  getSOLStatusMessage(statuteOfLimitationsDate: Date | null): string {
    if (!statuteOfLimitationsDate) {
      return 'Unknown - Unable to calculate statute of limitations';
    }

    const now = new Date();
    const isExpired = now > statuteOfLimitationsDate;

    if (isExpired) {
      const expiredDate = statuteOfLimitationsDate.toLocaleDateString();
      return `Time-barred - Expired on ${expiredDate}. Collection legal, lawsuit prohibited.`;
    } else {
      const daysRemaining = Math.floor(
        (statuteOfLimitationsDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const expiresDate = statuteOfLimitationsDate.toLocaleDateString();

      if (daysRemaining < 90) {
        return `Expires soon - ${daysRemaining} days remaining (${expiresDate})`;
      } else {
        return `Active - Expires ${expiresDate}`;
      }
    }
  }

  /**
   * Get disclaimer text for SOL calculations
   * Should be displayed in UI whenever SOL information is shown
   */
  getSOLDisclaimer(): string {
    return (
      'LEGAL DISCLAIMER: Statute of limitations calculations are advisory only and do not constitute legal advice. ' +
      'SOL periods vary by jurisdiction and can be affected by debtor actions (payments, acknowledgments). ' +
      'Some states have "borrowing statutes" or other complexities. ' +
      'Consult legal counsel before relying on SOL status for collection decisions or litigation.'
    );
  }
}
