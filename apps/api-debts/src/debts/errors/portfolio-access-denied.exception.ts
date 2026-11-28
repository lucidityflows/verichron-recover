import { BaseException } from "@verichron/error-handling";
import { HttpStatus } from "@nestjs/common";

// ============================================================================
// portfolio-access-denied.exception.ts
// ============================================================================

/**
 * Exception thrown when a user attempts to access a debt from a portfolio
 * they do not have permission to access.
 * 
 * HTTP Status: 403 Forbidden
 * Error Code: DEBTS_DEBTS_005
 * 
 * This represents a Layer 2 authorization failure. The user has passed
 * Layer 1 (JWT contains debt:read permission) but failed Layer 2
 * (user does not have access to the specific portfolio).
 * 
 * User-portfolio permissions are managed via the user_portfolio_permission table.
 */
export class PortfolioAccessDeniedException extends BaseException {
  constructor(portfolioId: string) {
    super(
      `Access denied. You do not have permission to access debts in portfolio '${portfolioId}'.`,
      HttpStatus.FORBIDDEN,
      'DEBTS_DEBTS_005',
    );
  }
}