import { DebtorVerificationStatus } from '@verichron/enums';

/**
 * Payload for DebtorVerificationStatusChanged event
 * Published by api-debtors when verification status changes
 */
export interface DebtorVerificationStatusChangedPayload {
  /** Unique debtor identifier */
  debtorId: string;

  /** Previous verification status */
  previousStatus: DebtorVerificationStatus;

  /** New verification status */
  newStatus: DebtorVerificationStatus;

  /** Timestamp when status changed */
  statusChangedAt: string;

  /** Optional verification source (e.g., 'MANUAL', 'USPS', 'THIRD_PARTY_API') */
  verificationSource?: string;
}