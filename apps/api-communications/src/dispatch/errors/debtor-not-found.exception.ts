import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class DebtorNotFoundException extends BaseException {
  constructor(debtorId: string) {
    super(
      `Debtor with ID '${debtorId}' not found`,
      HttpStatus.NOT_FOUND,
      'COMMS_DISPATCH_003'
    );
  }
}