import { BaseException } from "@verichron/error-handling";
import { HttpStatus } from "@nestjs/common";


// ============================================================================
// user-not-assigned.exception.ts
// ============================================================================

/**
 * Exception thrown when attempting to revoke access for a user who doesn't have it.
 * 
 * HTTP Status: 404 Not Found
 * Error Code: DEBTS_PORTFOLIOS_004
 * 
 * This ensures the caller is aware the user never had access or it was
 * already revoked.
 */
export class UserNotAssignedException extends BaseException {
  constructor(userId: string, portfolioId: string) {
    super(
      `User '${userId}' does not have access to portfolio '${portfolioId}'. Cannot revoke non-existent access.`,
      HttpStatus.NOT_FOUND,
      'DEBTS_PORTFOLIOS_004',
    );
  }
}

