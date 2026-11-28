/**
 * Payload for PasswordResetRequested event
 */
export interface PasswordResetRequestedPayload {
  userId: string;
  email: string;
  resetToken: string;
  resetTokenExpiresAt: string;
  ipAddress: string;
}
