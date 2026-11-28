import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Plan Approval Required Exception
 * 
 * Thrown when a payment plan cannot be auto-approved because it exceeds
 * the organization's approval threshold.
 */
export class PlanApprovalRequiredException extends BaseException {
  constructor(totalAmount: number, threshold: number) {
    super(
      `Payment plan amount $${totalAmount} exceeds the auto-approval threshold of $${threshold}. Admin approval is required.`,
      HttpStatus.BAD_REQUEST,
      'TRANSACTIONS_PLANS_003',
    );
  }
}
