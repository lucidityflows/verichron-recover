/**
 * Payload for UserActivated event
 */
export interface UserActivatedPayload {
  userId: string;
  organizationId: string | null;
  activatedAt: string;
}

