import { BaseException } from "@verichron/error-handling";
import { HttpStatus } from "@nestjs/common";

// ============================================================================
// user-already-assigned.exception.ts
// ============================================================================

/**
 * Exception thrown when attempting to assign a user who already has access.
 * 
 * HTTP Status: 409 Conflict
 * Error Code: DEBTS_PORTFOLIOS_003
 * 
 * This prevents duplicate entries in the user_portfolio_permission table
 * and provides clear feedback to the caller.
 */
export class UserAlreadyAssignedException extends BaseException {
  constructor(userId: string, portfolioId: string) {
    super(
      `User '${userId}' already has access to portfolio '${portfolioId}'. Cannot assign duplicate access.`,
      HttpStatus.CONFLICT,
      'DEBTS_PORTFOLIOS_003',
    );
  }
}
