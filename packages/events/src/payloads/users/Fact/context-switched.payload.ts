/**
 * Payload for ContextSwitched event
 */
export interface ContextSwitchedPayload {
  userId: string;
  fromOrganizationId: string;
  toOrganizationId: string | null;
  ipAddress?: string;
}
