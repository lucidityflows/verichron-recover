/**
 * Payload for UserDeleted event
 */
export interface UserDeletedPayload {
  userId: string;
  organizationId: string;
  reason?: string;
  deletedAt: string;
  deletedBy?: string;
}

