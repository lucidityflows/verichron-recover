import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class InvalidHistoryDateRangeException extends BaseException {
  constructor(message: string) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'DEBTS_HISTORY_002',
    );
  }
}
