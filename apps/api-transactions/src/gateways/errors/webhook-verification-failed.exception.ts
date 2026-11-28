

import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Webhook Verification Failed Exception
 * 
 * Thrown when a webhook request fails signature verification.
 * This is a security-critical exception that prevents webhook spoofing.
 */
export class WebhookVerificationFailedException extends BaseException {
  constructor(provider: string) {
    super(
      `${provider} webhook signature verification failed. Possible spoofing attempt.`,
      HttpStatus.UNAUTHORIZED,
      'TRANSACTIONS_GATEWAY_002',
    );
  }
}