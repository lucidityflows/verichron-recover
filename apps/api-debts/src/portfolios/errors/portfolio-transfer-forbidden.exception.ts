import { BaseException } from "@verichron/error-handling";
import { HttpStatus } from "@nestjs/common";


// ============================================================================
// portfolio-transfer-forbidden.exception.ts
// ============================================================================

/**
 * Exception thrown when portfolio transfer is not allowed.
 * 
 * HTTP Status: 403 Forbidden
 * Error Code: DEBTS_PORTFOLIOS_005
 * 
 * Common scenarios:
 * - Portfolio is not in a transferable state (e.g., still PROVISIONING)
 * - Attempting to transfer to the same organization (no-op)
 * - Portfolio is already SOLD
 * - User lacks portfolio:transfer permission
 */
export class PortfolioTransferForbiddenException extends BaseException {
  constructor(portfolioId: string, reason: string) {
    super(
      `Portfolio '${portfolioId}' cannot be transferred. Reason: ${reason}`,
      HttpStatus.FORBIDDEN,
      'DEBTS_PORTFOLIOS_005',
    );
  }
}