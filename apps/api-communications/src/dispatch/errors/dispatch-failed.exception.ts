import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class DispatchFailedException extends BaseException {
  constructor(reason: string, details?: any) {
    super(
      `Communication dispatch failed: ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'COMMS_DISPATCH_001'
    );
  }
}
