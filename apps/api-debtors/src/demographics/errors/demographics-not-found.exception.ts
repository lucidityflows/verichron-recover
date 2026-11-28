// demographics-not-found.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when demographics record is not found for a debtor
 * Error Code: DEBTORS_DEMOGRAPHICS_001
 */
export class DemographicsNotFoundException extends BaseException {
  constructor(debtorId: string) {
    super(
      `Demographics record not found for debtor '${debtorId}'.`,
      HttpStatus.NOT_FOUND,
      'DEBTORS_DEMOGRAPHICS_001'
    );
  }
}
