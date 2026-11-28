

// unauthorized-verification-access.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a user attempts to access a verification they don't have permission for
 * Error Code: DEBTORS_VERIFICATION_002
 */
export class UnauthorizedVerificationAccessException extends BaseException {
  constructor(verificationId: string, organizationId: string) {
    super(
      `Organization '${organizationId}' does not have access to verification '${verificationId}'.`,
      HttpStatus.FORBIDDEN,
      'DEBTORS_VERIFICATION_002'
    );
  }
}