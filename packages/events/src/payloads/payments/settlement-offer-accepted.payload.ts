/**
 * Payload for SettlementOfferAccepted event
 */
export interface SettlementOfferAcceptedPayload {
  settlementOfferId: string;
  debtId: string;
  organizationId: string;
  settlementAmount: number;
  paymentStructure: 'LUMP_SUM' | 'INSTALLMENT';
  resolvedBy: string;
  resolutionDate: string;
  acceptedAt: string;
}
