// verification-not-found.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a requested verification request is not found
 * Error Code: DEBTORS_VERIFICATION_001
 */
export class VerificationNotFoundException extends BaseException {
  constructor(verificationId: string) {
    super(
      `Verification request with ID '${verificationId}' not found.`,
      HttpStatus.NOT_FOUND,
      'DEBTORS_VERIFICATION_001'
    );
  }
}