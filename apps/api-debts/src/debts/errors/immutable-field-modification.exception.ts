import { BaseException } from "@verichron/error-handling";
import { HttpStatus } from "@nestjs/common";

// ============================================================================
// immutable-field-modification.exception.ts
// ============================================================================

/**
 * Exception thrown when an attempt is made to modify an immutable field.
 * 
 * HTTP Status: 400 Bad Request
 * Error Code: DEBTS_DEBTS_002
 * 
 * Immutable fields:
 * - principalAmount (original debt amount - audit integrity)
 * - originalDebtDate (date debt was incurred - audit integrity)
 * - accountNumber (creditor's account identifier - audit integrity)
 * - organizationId (tenant ownership - security)
 * - portfolioId (requires special transfer process)
 * 
 * Rationale: These fields establish the legal and historical basis of the debt
 * and must never be modified after creation to maintain audit integrity and
 * prevent fraud.
 */
export class ImmutableFieldModificationException extends BaseException {
  constructor(fieldName: string) {
    super(
      `Cannot modify immutable field '${fieldName}'. This field is locked after creation to maintain audit integrity.`,
      HttpStatus.BAD_REQUEST,
      'DEBTS_DEBTS_002',
    );
  }
}

