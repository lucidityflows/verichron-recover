// ============================================================================
// portfolio-not-found.exception.ts
// ============================================================================

import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a requested portfolio cannot be found.
 * 
 * HTTP Status: 404 Not Found
 * Error Code: DEBTS_PORTFOLIOS_001
 * 
 * Common scenarios:
 * - Portfolio ID does not exist in the database
 * - User attempts to access a portfolio from a different organization
 * - Portfolio has been soft-deleted (if implemented)
 */
export class PortfolioNotFoundException extends BaseException {
  constructor(portfolioId: string) {
    super(
      `Portfolio with ID '${portfolioId}' not found or you do not have access to it.`,
      HttpStatus.NOT_FOUND,
      'DEBTS_PORTFOLIOS_001',
    );
  }
}