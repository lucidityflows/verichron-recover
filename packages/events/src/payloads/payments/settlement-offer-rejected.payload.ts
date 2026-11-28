/**
 * Payload for SettlementOfferRejected event
 */
export interface SettlementOfferRejectedPayload {
  settlementOfferId: string;
  debtId: string;
  organizationId: string;
  resolvedBy: string;
  resolutionDate: string;
  rejectedAt: string;
}
