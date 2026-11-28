import { LoginMethod } from "@verichron/enums";

/**
 * Payload for LoginSuccess event
 *
 * Represents successful credential validation (authentication).
 * organizationId is NOT included here - organization selection happens in a separate step.
 */
export interface LoginSuccessPayload {
  userId: string;
  email: string;
  loginMethod: LoginMethod;
  ipAddress?: string;
  userAgent?: string;
}