/**
 * Payload for SettlementOfferCreated event
 */
export interface SettlementOfferCreatedPayload {
  settlementOfferId: string;
  debtId: string;
  organizationId: string;
  offeredBy: 'CREDITOR' | 'DEBTOR';
  originalBalance: number;
  settlementAmount: number;
  settlementPercentage: number;
  paymentStructure: 'LUMP_SUM' | 'INSTALLMENT';
  offerDate: string;
  expirationDate: string | null;
  createdAt: string;
}
