import { VerificationType } from '@verichron/enums';

/**
 * Payload for VerificationFailed event
 * Published when a verification fails or encounters an error
 */
export interface VerificationFailedPayload {
  /** Verification request identifier */
  verificationId: string;

  /** Debtor ID */
  debtorId: string;

  /** Organization context */
  organizationId: string;

  /** Type of verification */
  verificationType: VerificationType;

  /** Error message */
  errorMessage: string;

  /** Error code */
  errorCode?: string;

  /** Number of retry attempts */
  retryCount: number;

  /** Timestamp when failure occurred */
  failedAt: string;
}
