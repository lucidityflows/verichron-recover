import type { TokenType, TokenIssuanceMethod } from '@verichron/enums';

/**
 * Payload for TokenIssued event
 *
 * Represents the issuance of an access or refresh token for a specific organization.
 * This is the authorization step - user has been granted access to a specific org context.
 */
export interface TokenIssuedPayload {
  userId: string;
  organizationId: string | null;
  tokenType: TokenType;
  expiresAt: string;
  /**
   * How the token was obtained
   */
  issuanceMethod: TokenIssuanceMethod;
  ipAddress?: string;
}