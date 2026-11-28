import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class DebtNotFoundForHistoryException extends BaseException {
  constructor(debtId: string) {
    super(
      `Debt with ID '${debtId}' not found, or you do not have permission to view its history.`,
      HttpStatus.NOT_FOUND,
      'DEBTS_HISTORY_001',
    );
  }
}
