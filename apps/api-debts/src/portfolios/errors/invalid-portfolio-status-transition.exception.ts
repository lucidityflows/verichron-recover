import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';


// ============================================================================
// invalid-portfolio-status-transition.exception.ts
// ============================================================================

import { PortfolioStatus } from '@verichron/enums';

/**
 * Exception thrown when an invalid portfolio status transition is attempted.
 * 
 * HTTP Status: 400 Bad Request
 * Error Code: DEBTS_PORTFOLIOS_002
 * 
 * Status transitions are enforced via a state machine defined in
 * VALID_STATUS_TRANSITIONS. This prevents illogical state changes.
 * 
 * Example invalid transitions:
 * - SOLD → ACTIVE (cannot reactivate a sold portfolio)
 * - PROVISIONING → CLOSED (must go through ACTIVE first)
 * - CLOSED → PROVISIONING (cannot revert to provisioning)
 * 
 * Valid transitions are documented in portfolio-status.enum.ts
 */
export class InvalidPortfolioStatusTransitionException extends BaseException {
  constructor(currentStatus: PortfolioStatus, attemptedStatus: PortfolioStatus) {
    super(
      `Invalid status transition from '${currentStatus}' to '${attemptedStatus}'. This transition is not allowed by the portfolio lifecycle state machine.`,
      HttpStatus.BAD_REQUEST,
      'DEBTS_PORTFOLIOS_002',
    );
  }
}