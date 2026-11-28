/**
 * Security Configuration Constants
 *
 * These values define the security parameters for HMAC-based
 * service-to-service authentication.
 */

/**
 * Maximum allowed time drift between caller and receiver
 * Default: 5 minutes (300,000 ms)
 *
 * Purpose: Prevents replay attacks using old requests
 * Adjust based on your infrastructure's clock synchronization accuracy
 */
export const MAX_TIME_DRIFT_MS = 5 * 60 * 1000;

/**
 * Time-to-live for nonce cache entries
 * Default: 10 minutes (600,000 ms)
 *
 * Purpose: Prevents replay attacks using duplicate requests
 * Should be >= MAX_TIME_DRIFT_MS to catch all potential replays
 */
export const NONCE_TTL_MS = 10 * 60 * 1000;

/**
 * HMAC algorithm used for request signing
 * Default: 'sha256'
 *
 * DO NOT change this without rotating all service keys
 */
export const HMAC_ALGORITHM = 'sha256';

/**
 * HTTP headers used for internal authentication
 */
export const INTERNAL_AUTH_HEADERS = {
  SERVICE_NAME: 'x-service-name',
  TIMESTAMP: 'x-timestamp',
  NONCE: 'x-nonce',
  SIGNATURE: 'x-signature',
} as const;

/**
 * Service names for service-scoped authentication
 * These map to environment variable names for keys
 */
export const SERVICE_NAMES = {
  USERS: 'api-users',
  ORGANIZATIONS: 'api-organizations',
  DEBTS: 'api-debts',
  DEBTORS: 'api-debtors',
  TRANSACTIONS: 'api-transactions',
  COMMUNICATIONS: 'api-communications',
} as const;
