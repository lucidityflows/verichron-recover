/**
 * Payload for SettlementOfferCompleted event
 */
export interface SettlementOfferCompletedPayload {
  settlementOfferId: string;
  debtId: string;
  organizationId: string;
  settlementAmount: number;
  completionDate: string;
  completedAt: string;
}
