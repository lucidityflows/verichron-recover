import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class RateLimitExceededException extends BaseException {
  constructor(provider: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for provider '${provider}'`,
      HttpStatus.TOO_MANY_REQUESTS,
      'COMMS_GATEWAY_004'
    );
  }
}