import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Gateway Exception
 * 
 * Thrown when payment gateway operations fail for technical reasons
 * (network errors, API errors, etc.).
 */
export class GatewayException extends BaseException {
  constructor(provider: string, operation: string, reason: string) {
    super(
      `${provider} gateway ${operation} failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'TRANSACTIONS_GATEWAY_001',
    );
  }
}