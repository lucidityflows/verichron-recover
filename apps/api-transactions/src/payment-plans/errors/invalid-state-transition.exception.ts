import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Invalid State Transition Exception
 * 
 * Thrown when attempting to transition a payment plan to an invalid status.
 */
export class InvalidStateTransitionException extends BaseException {
  constructor(planId: string, fromStatus: string, toStatus: string) {
    super(
      `Cannot transition payment plan '${planId}' from '${fromStatus}' to '${toStatus}'. Invalid state transition.`,
      HttpStatus.BAD_REQUEST,
      'TRANSACTIONS_PLANS_005',
    );
  }
}