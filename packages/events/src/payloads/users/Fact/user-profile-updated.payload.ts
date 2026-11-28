/**
 * Payload for UserProfileUpdated event
 */
export interface UserProfileUpdatedPayload {
  userId: string;
  organizationId: string | null;
  updatedFields: string[];
  updatedAt: string;
  updatedBy?: string;
}
