/**
 * Payload for UserCreated event
 */
export interface UserCreatedPayload {
  userId: string;
  organizationId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  
  /**
   * One-time invitation token for account activation.
   * ⚠️ SENSITIVE: Only include in secure event channels.
   * Consumers must treat this as a credential.
   */
  invitationToken: string;
  
  /**
   * When the invitation expires (ISO 8601 timestamp).
   */
  invitationExpiresAt: string;
  
  /**
   * The initial role assigned to this user.
   * Note: Users may have additional roles assigned later.
   */
  roleId: string;
  
  /**
   * ID of the user who created this invitation.
   * May be null for system-generated users (e.g., initial org admin).
   */
  createdBy: string | null;
}


