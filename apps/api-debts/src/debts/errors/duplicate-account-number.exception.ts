import { BaseException } from "@verichron/error-handling";
import { HttpStatus } from "@nestjs/common";

// ============================================================================
// duplicate-account-number.exception.ts
// ============================================================================

/**
 * Exception thrown when attempting to create a debt with an account number
 * that already exists for the organization.
 * 
 * HTTP Status: 409 Conflict
 * Error Code: DEBTS_DEBTS_004
 * 
 * Account numbers must be unique within an organization to prevent
 * duplicate debt imports and maintain data integrity.
 */
export class DuplicateAccountNumberException extends BaseException {
  constructor(accountNumber: string, organizationId: string) {
    super(
      `A debt with account number '${accountNumber}' already exists for this organization. Account numbers must be unique within an organization.`,
      HttpStatus.CONFLICT,
      'DEBTS_DEBTS_004',
    );
  }
}

