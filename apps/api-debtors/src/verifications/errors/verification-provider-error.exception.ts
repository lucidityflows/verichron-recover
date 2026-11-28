

// verification-provider-error.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a verification provider fails
 * Error Code: DEBTORS_VERIFICATION_003
 */
export class VerificationProviderErrorException extends BaseException {
  constructor(provider: string, reason: string) {
    super(
      `Verification provider '${provider}' error: ${reason}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'DEBTORS_VERIFICATION_003'
    );
  }
}