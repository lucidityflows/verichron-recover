import { BaseException } from "@verichron/error-handling";
import { HttpStatus } from "@nestjs/common";
import { DebtStatus } from '@verichron/enums';
// ============================================================================
// invalid-status-transition.exception.ts
// ============================================================================

/**
 * Exception thrown when an invalid debt status transition is attempted.
 * 
 * HTTP Status: 400 Bad Request
 * Error Code: DEBTS_DEBTS_003
 * 
 * Status transitions are enforced via a state machine defined in
 * VALID_STATUS_TRANSITIONS. This prevents illogical state changes like
 * moving from PAID_IN_FULL back to ACTIVE.
 * 
 * Example invalid transitions:
 * - PAID_IN_FULL → ACTIVE
 * - SOLD → IN_COLLECTION
 * - CHARGED_OFF → PAYMENT_PLAN
 * 
 * Valid transitions are documented in debt-status.enum.ts
 */
export class InvalidStatusTransitionException extends BaseException {
  constructor(currentStatus: DebtStatus, attemptedStatus: DebtStatus) {
    super(
      `Invalid status transition from '${currentStatus}' to '${attemptedStatus}'. This transition is not allowed by the debt lifecycle state machine.`,
      HttpStatus.BAD_REQUEST,
      'DEBTS_DEBTS_003',
    );
  }
}

