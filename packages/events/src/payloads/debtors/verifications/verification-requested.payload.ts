import { VerificationType } from '@verichron/enums';

/**
 * Payload for VerificationRequested event
 * Published when a verification is requested (trigger for processing)
 */
export interface VerificationRequestedPayload {
  /** Verification request identifier */
  verificationId: string;

  /** Debtor Identity ID */
  debtorId: string;

  /** Debtor Profile ID */
  debtorProfileId: string;

  /** Organization context */
  organizationId: string;

  /** Type of verification */
  verificationType: VerificationType;

  /** Input data for verification */
  inputData: Record<string, any>;

  /** Timestamp when verification was requested */
  requestedAt: string;

  /** User who requested verification */
  requestedBy: string;
}
