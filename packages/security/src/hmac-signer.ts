import * as crypto from 'crypto';
import { HMAC_ALGORITHM } from './constants';

/**
 * HMAC Request Signer
 *
 * Provides cryptographic signing and verification for internal service-to-service
 * HTTP requests. Prevents replay attacks, request tampering, and unauthorized access.
 *
 * Security Properties:
 * - Prevents replay attacks (via timestamp + nonce)
 * - Prevents request tampering (via signature verification)
 * - Prevents key interception (key never transmitted, only signature)
 * - Prevents service impersonation (service-specific keys)
 *
 * @example
 * // Signing a request
 * const signature = HmacSigner.sign('POST', '/internal/analytics', '{"data":"value"}', serviceKey, Date.now(), uuid());
 *
 * // Verifying a request
 * const isValid = HmacSigner.verify('POST', '/internal/analytics', '{"data":"value"}', serviceKey, timestamp, nonce, signature);
 */
export class HmacSigner {
  /**
   * Signs a request with HMAC-SHA256
   *
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - Request path (e.g., '/internal/analytics/dashboard-summary/123')
   * @param body - Stringified request body (use empty string for GET requests)
   * @param secret - Service-specific API key
   * @param timestamp - Unix timestamp in milliseconds
   * @param nonce - Unique request identifier (UUID recommended)
   * @returns HMAC signature as hex string
   *
   * @example
   * const signature = HmacSigner.sign(
   *   'POST',
   *   '/internal/analytics',
   *   JSON.stringify({ organizationId: '123' }),
   *   process.env.SERVICE_KEY_ORGANIZATIONS!,
   *   Date.now(),
   *   crypto.randomUUID()
   * );
   */
  static sign(
    method: string,
    path: string,
    body: string,
    secret: string,
    timestamp: number,
    nonce: string
  ): string {
    // Construct canonical message
    // Format: METHOD:PATH:BODY:TIMESTAMP:NONCE
    const message = `${method}:${path}:${body}:${timestamp}:${nonce}`;

    // Create HMAC signature
    return crypto
      .createHmac(HMAC_ALGORITHM, secret)
      .update(message)
      .digest('hex');
  }

  /**
   * Verifies request signature using constant-time comparison
   *
   * @param method - HTTP method from request
   * @param path - Request path from request
   * @param body - Stringified request body from request
   * @param secret - Service-specific API key for the caller
   * @param timestamp - Timestamp from request headers
   * @param nonce - Nonce from request headers
   * @param providedSignature - Signature from request headers
   * @returns true if signature is valid, false otherwise
   *
   * @throws Error if provided signature is not a valid hex string
   *
   * @example
   * const isValid = HmacSigner.verify(
   *   request.method,
   *   request.path,
   *   JSON.stringify(request.body),
   *   process.env.SERVICE_KEY_ORGANIZATIONS!,
   *   parseInt(request.headers['x-timestamp']),
   *   request.headers['x-nonce'],
   *   request.headers['x-signature']
   * );
   */
  static verify(
    method: string,
    path: string,
    body: string,
    secret: string,
    timestamp: number,
    nonce: string,
    providedSignature: string
  ): boolean {
    try {
      // Generate expected signature
      const expectedSignature = this.sign(method, path, body, secret, timestamp, nonce);

      // Use constant-time comparison to prevent timing attacks
      // crypto.timingSafeEqual requires equal-length buffers
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const providedBuffer = Buffer.from(providedSignature, 'hex');

      // If lengths don't match, return false immediately
      // (this is safe because length is not secret information)
      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      // Perform constant-time comparison
      return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch (error) {
      // Invalid hex string or other error - signature is invalid
      return false;
    }
  }

  /**
   * Generates a canonical request string for debugging
   * DO NOT use this in production - for logging/debugging only
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param body - Stringified request body
   * @param timestamp - Unix timestamp in milliseconds
   * @param nonce - Unique request identifier
   * @returns Canonical message string (DO NOT LOG IN PRODUCTION)
   */
  static getCanonicalMessage(
    method: string,
    path: string,
    body: string,
    timestamp: number,
    nonce: string
  ): string {
    return `${method}:${path}:${body}:${timestamp}:${nonce}`;
  }
}
