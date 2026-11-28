/**
 * Payload for CreditorUpdated event
 */
export interface CreditorUpdatedPayload {
  creditorId: string;
  organizationId: string;
  debtCount: number;
  totalPrincipal: number;
  updatedAt: string;
}
