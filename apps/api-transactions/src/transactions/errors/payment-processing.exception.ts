import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Payment Processing Exception
 * 
 * Thrown when payment gateway processing fails for technical reasons
 * (not business logic failures like card declined).
 */
export class PaymentProcessingException extends BaseException {
  constructor(message: string) {
    super(
      `Payment processing failed: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'TRANSACTIONS_TRANS_004',
    );
  }
}