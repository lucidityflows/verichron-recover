// ============================================================================
// debt-not-found.exception.ts
// ============================================================================

import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a requested debt cannot be found.
 * 
 * HTTP Status: 404 Not Found
 * Error Code: DEBTS_DEBTS_001
 * 
 * Common scenarios:
 * - Debt ID does not exist in the database
 * - User attempts to access a debt from a different organization
 * - Debt has been soft-deleted
 */
export class DebtNotFoundException extends BaseException {
  constructor(debtId: string) {
    super(
      `Debt with ID '${debtId}' not found or you do not have access to it.`,
      HttpStatus.NOT_FOUND,
      'DEBTS_DEBTS_001',
    );
  }
}

