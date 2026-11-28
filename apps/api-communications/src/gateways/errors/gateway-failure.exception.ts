import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class GatewayFailureException extends BaseException {
  constructor(provider: string, reason: string, providerError?: any) {
    super(
      `Gateway '${provider}' failed: ${reason}`,
      HttpStatus.BAD_GATEWAY,
      'COMMS_GATEWAY_002'
    );
  }
}
