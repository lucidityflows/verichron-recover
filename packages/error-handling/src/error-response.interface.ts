/**
 * Standard error response interface for all Verichron services.
 * This defines the public contract for what an error looks like across the platform.
 */
export interface ErrorResponse {
  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * Human-readable error message
   */
  message: string | string[];

  /**
   * Stable, unique error code for this error type (e.g., 'USERS_001', 'DEBTS_002')
   */
  errorCode: string;

  /**
   * ISO 8601 timestamp when the error occurred
   */
  timestamp: string;

  /**
   * Request path that triggered the error
   */
  path: string;
}
