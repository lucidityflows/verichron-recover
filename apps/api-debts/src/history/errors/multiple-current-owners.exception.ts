import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class MultipleCurrentOwnersException extends BaseException {
  constructor(debtId: string, count: number) {
    super(
      `Data integrity violation for debt '${debtId}': Found ${count} current owners (with null soldDate) where only one is allowed.`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DEBTS_HISTORY_003',
    );
  }
}
