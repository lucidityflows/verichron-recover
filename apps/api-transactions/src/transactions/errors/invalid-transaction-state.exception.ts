import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Invalid Transaction State Exception
 * 
 * Thrown when attempting to perform an operation on a transaction
 * in an invalid state (e.g., refunding a failed payment).
 */
export class InvalidTransactionStateException extends BaseException {
  constructor(transactionId: string, currentStatus: string, requiredStatus: string) {
    super(
      `Transaction '${transactionId}' is in status '${currentStatus}' but '${requiredStatus}' is required for this operation.`,
      HttpStatus.BAD_REQUEST,
      'TRANSACTIONS_TRANS_002',
    );
  }
}