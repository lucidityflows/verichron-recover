import { VerificationType } from '@verichron/enums';

/**
 * Payload for VerificationCompleted event
 * Published when a verification completes successfully
 */
export interface VerificationCompletedPayload {
  /** Verification request identifier */
  verificationId: string;

  /** Debtor ID */
  debtorId: string;

  /** Organization context */
  organizationId: string;

  /** Type of verification */
  verificationType: VerificationType;

  /** Whether verification passed */
  verified: boolean;

  /** Confidence score 0-100 */
  confidenceScore?: number;

  /** Verification result details */
  result: Record<string, any>;

  /** Provider used */
  provider: string;

  /** Cost in cents */
  costCents?: number;

  /** Timestamp when verification completed */
  completedAt: string;
}
