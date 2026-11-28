/**
 * Payload for UserStatusChanged event
 */
export interface UserStatusChangedPayload {
  userId: string;
  organizationId: string | null;
  oldStatus: string;
  newStatus: string;
  reason?: string;
  statusChangedAt: string;
  changedBy?: string;
}
