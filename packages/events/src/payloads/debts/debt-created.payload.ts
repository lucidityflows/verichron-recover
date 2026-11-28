/**
 * Payload for DebtCreated event
 */
export interface DebtCreatedPayload {
  debtId: string;
  debtorIdentityId?: string; // Optional - may not be known for manual debt creation
  debtorProfileId: string;
  organizationId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}