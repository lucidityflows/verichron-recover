/**
 * Payload for ChargeOffReversed event
 */
export interface ChargeOffReversedPayload {
  chargeOffId: string;
  debtId: string;
  organizationId: string;
  reversalDate: string;
  reversalReason: string;
  recoveredAmount: number | null;
  reversedAt: string;
}
