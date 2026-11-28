/**
 * Payload for SettlementOfferDefaulted event
 */
export interface SettlementOfferDefaultedPayload {
  settlementOfferId: string;
  debtId: string;
  organizationId: string;
  settlementAmount: number;
  defaultedAt: string;
}
