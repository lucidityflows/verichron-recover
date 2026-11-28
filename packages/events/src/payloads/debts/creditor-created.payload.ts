/**
 * Payload for CreditorCreated event
 */
export interface CreditorCreatedPayload {
  creditorId: string;
  organizationId: string;
  legalName: string;
  ein: string | null;
  normalizedName: string;
  state: string | null;
  createdAt: string;
}
