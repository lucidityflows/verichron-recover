import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Plan Not Found Exception
 * 
 * Thrown when a requested payment plan does not exist or the user
 * does not have access to it.
 */
export class PlanNotFoundException extends BaseException {
  constructor(planId: string) {
    super(
      `Payment plan with ID '${planId}' not found or access denied.`,
      HttpStatus.NOT_FOUND,
      'TRANSACTIONS_PLANS_001',
    );
  }
}