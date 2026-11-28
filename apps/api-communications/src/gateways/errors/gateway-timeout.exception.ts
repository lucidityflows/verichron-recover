import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class GatewayTimeoutException extends BaseException {
  constructor(provider: string, operation: string) {
    super(
      `Gateway '${provider}' timeout during ${operation}`,
      HttpStatus.GATEWAY_TIMEOUT,
      'COMMS_GATEWAY_001'
    );
  }
}