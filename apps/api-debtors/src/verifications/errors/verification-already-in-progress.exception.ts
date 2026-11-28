

// verification-already-in-progress.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to start a verification that's already in progress
 * Error Code: DEBTORS_VERIFICATION_004
 */
export class VerificationAlreadyInProgressException extends BaseException {
  constructor(debtorId: string, verificationType: string) {
    super(
      `A ${verificationType} verification is already in progress for debtor '${debtorId}'.`,
      HttpStatus.CONFLICT,
      'DEBTORS_VERIFICATION_004'
    );
  }
}