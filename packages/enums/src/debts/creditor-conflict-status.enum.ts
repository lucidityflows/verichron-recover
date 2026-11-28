/**
 * Creditor Conflict Status Enumeration
 *
 * Represents the lifecycle status of a creditor entity resolution conflict
 * in the manual review queue.
 *
 * **Four-Tier Confidence System:**
 * - HIGH_CONFIDENCE (95-100%): "Green Strip" bulk approval workflow
 * - MEDIUM_CONFIDENCE (70-94%): "Amber Zone" individual review required
 * - LOW_CONFIDENCE (40-69%): "Red Zone" confirm new creditor creation
 * - Below 40%: Noise floor (no conflict created, silent auto-create)
 *
 * **Human-in-the-Loop Philosophy:**
 * AI suggests, humans decide. No auto-resolution at any confidence level.
 *
 * @see APPROVED-VERTEX-AI-IMPORT-STRATEGY.md
 */
export enum CreditorConflictStatus {
  /**
   * High confidence match (95-100% similarity).
   * Typically platform-verified (Gold List) matches.
   * Displayed in "Green Strip" UI for bulk approval.
   */
  HIGH_CONFIDENCE = 'HIGH_CONFIDENCE',

  /**
   * Medium confidence match (70-94% similarity).
   * Requires individual review in "Amber Zone" workflow.
   * Most common status for fuzzy name matches.
   */
  MEDIUM_CONFIDENCE = 'MEDIUM_CONFIDENCE',

  /**
   * Low confidence match (40-69% similarity).
   * Displayed in "Red Zone" with recommendation to create new creditor.
   * User must explicitly confirm merge or create new.
   */
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',

  /**
   * Conflict has been resolved by user action.
   * User either approved merge or created new creditor.
   * Terminal state.
   */
  RESOLVED = 'RESOLVED',

  /**
   * Conflict has been dismissed without action.
   * Used when user wants to defer decision.
   * Can be reopened later from dismissed queue.
   */
  DISMISSED = 'DISMISSED',
}
