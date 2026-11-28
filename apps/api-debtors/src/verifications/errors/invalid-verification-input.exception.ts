

// invalid-verification-input.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when verification input data is invalid
 * Error Code: DEBTORS_VERIFICATION_005
 */
export class InvalidVerificationInputException extends BaseException {
  constructor(verificationType: string, reason: string) {
    super(
      `Invalid input for ${verificationType}: ${reason}`,
      HttpStatus.BAD_REQUEST,
      'DEBTORS_VERIFICATION_005'
    );
  }
}