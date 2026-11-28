

// demographics-already-exists.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to create demographics that already exist
 * Error Code: DEBTORS_DEMOGRAPHICS_003
 */
export class DemographicsAlreadyExistsException extends BaseException {
  constructor(debtorId: string) {
    super(
      `Demographics record already exists for debtor '${debtorId}'. Use PUT or PATCH to update.`,
      HttpStatus.CONFLICT,
      'DEBTORS_DEMOGRAPHICS_003'
    );
  }
}