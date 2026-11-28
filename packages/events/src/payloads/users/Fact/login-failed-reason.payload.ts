import { LoginFailReason } from "@verichron/enums";

/**
 * Payload for LoginFailed event
 */
export interface LoginFailedPayload {
  email: string;
  reason: LoginFailReason;
  ipAddress?: string;
  userAgent?: string;
}
