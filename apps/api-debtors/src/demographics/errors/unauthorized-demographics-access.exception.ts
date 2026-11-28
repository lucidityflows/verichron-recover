
// unauthorized-demographics-access.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a user attempts to access demographics they don't have permission for
 * Error Code: DEBTORS_DEMOGRAPHICS_002
 */
export class UnauthorizedDemographicsAccessException extends BaseException {
  constructor(debtorId: string, organizationId: string) {
    super(
      `Organization '${organizationId}' does not have access to demographics for debtor '${debtorId}'.`,
      HttpStatus.FORBIDDEN,
      'DEBTORS_DEMOGRAPHICS_002'
    );
  }
}