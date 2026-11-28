import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Transaction Not Found Exception
 * 
 * Thrown when a requested transaction does not exist or the user
 * does not have access to it.
 */
export class TransactionNotFoundException extends BaseException {
  constructor(transactionId: string) {
    super(
      `Transaction with ID '${transactionId}' not found or access denied.`,
      HttpStatus.NOT_FOUND,
      'TRANSACTIONS_TRANS_001',
    );
  }
}