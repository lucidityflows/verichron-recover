// unauthorized-debtor-access.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a user attempts to access a debtor they don't have permission for
 * Error Code: DEBTORS_PROFILE_003
 */
export class UnauthorizedDebtorAccessException extends BaseException {
  constructor(debtorId: string, organizationId: string) {
    super(
      `Organization '${organizationId}' does not have access to debtor '${debtorId}'.`,
      HttpStatus.FORBIDDEN,
      'DEBTORS_PROFILE_003'
    );
  }
}

