
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Debt Already In Plan Exception
 * 
 * Thrown when attempting to add a debt to a payment plan when that debt
 * is already part of another ACTIVE payment plan.
 */
export class DebtAlreadyInPlanException extends BaseException {
  constructor(debtId: string, existingPlanId: string) {
    super(
      `Debt '${debtId}' is already part of an active payment plan '${existingPlanId}'. A debt can only belong to one active plan at a time.`,
      HttpStatus.CONFLICT,
      'TRANSACTIONS_PLANS_004',
    );
  }
}