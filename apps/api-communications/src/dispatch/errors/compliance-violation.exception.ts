import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class ComplianceViolationException extends BaseException {
  constructor(reason: string, nextAllowedAt?: Date) {
    super(
      `Compliance check failed: ${reason}`,
      HttpStatus.FORBIDDEN,
      'COMMS_DISPATCH_002'
    );
  }
}
