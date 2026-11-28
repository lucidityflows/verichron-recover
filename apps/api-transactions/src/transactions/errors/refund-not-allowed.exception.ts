import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Refund Not Allowed Exception
 * 
 * Thrown when a refund cannot be processed due to business rules
 * (e.g., amount exceeds original payment, transaction already refunded).
 */
export class RefundNotAllowedException extends BaseException {
  constructor(reason: string) {
    super(
      `Refund not allowed: ${reason}`,
      HttpStatus.BAD_REQUEST,
      'TRANSACTIONS_TRANS_003',
    );
  }
}