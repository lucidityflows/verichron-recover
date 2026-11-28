import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';


/**
 * Invalid Plan State Exception
 * 
 * Thrown when attempting to perform an operation on a payment plan
 * in an invalid state (e.g., updating an ACTIVE plan).
 */
export class InvalidPlanStateException extends BaseException {
  constructor(planId: string, currentStatus: string, requiredStatus: string) {
    super(
      `Payment plan '${planId}' is in status '${currentStatus}' but '${requiredStatus}' is required for this operation.`,
      HttpStatus.BAD_REQUEST,
      'TRANSACTIONS_PLANS_002',
    );
  }
}