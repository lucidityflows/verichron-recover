/**
 * Payload for ChargeOffRecorded event
 */
export interface ChargeOffRecordedPayload {
  chargeOffId: string;
  debtId: string;
  organizationId: string;
  chargeOffDate: string;
  reason: string;
  totalChargedOff: number;
  principalChargedOff: number;
  interestChargedOff: number;
  feesChargedOff: number;
  createdAt: string;
}
