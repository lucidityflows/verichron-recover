import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class InvalidWebhookSignatureException extends BaseException {
  constructor(provider: string) {
    super(
      `Invalid webhook signature from '${provider}'`,
      HttpStatus.UNAUTHORIZED,
      'COMMS_GATEWAY_003'
    );
  }
}