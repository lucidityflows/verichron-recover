import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

/**
 * HMAC Authentication Headers for internal service-to-service communication
 */
export const INTERNAL_AUTH_HEADERS = {
  SERVICE_NAME: 'x-service-name',
  TIMESTAMP: 'x-timestamp',
  NONCE: 'x-nonce',
  SIGNATURE: 'x-signature',
} as const;

/**
 * Utility for creating HMAC signatures for internal API authentication
 */
export class HmacAuthUtil {
  private static readonly logger = new Logger(HmacAuthUtil.name);

  /**
   * Generate HMAC authentication headers for internal service requests
   *
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - Request path (e.g., '/internal/analytics/recovery-trends/123')
   * @param serviceName - Name of the calling service
   * @param serviceKey - Secret key for HMAC signing
   * @param body - Optional request body (for POST/PUT)
   * @returns Object with authentication headers
   */
  static generateAuthHeaders(
    method: string,
    path: string,
    serviceName: string,
    serviceKey: string,
    body?: any,
  ): Record<string, string> {
    const timestamp = Date.now();
    const nonce = crypto.randomUUID();

    // Create signature payload
    const payload = [
      method.toUpperCase(),
      path,
      timestamp,
      nonce,
      body ? JSON.stringify(body) : '',
    ].join(':');

    // Generate HMAC signature
    const signature = crypto
      .createHmac('sha256', serviceKey)
      .update(payload)
      .digest('hex');

    return {
      [INTERNAL_AUTH_HEADERS.SERVICE_NAME]: serviceName,
      [INTERNAL_AUTH_HEADERS.TIMESTAMP]: timestamp.toString(),
      [INTERNAL_AUTH_HEADERS.NONCE]: nonce,
      [INTERNAL_AUTH_HEADERS.SIGNATURE]: signature,
    };
  }

  /**
   * Generate auth headers and log them for debugging
   *
   * @param method - HTTP method
   * @param path - Request path
   * @param serviceName - Calling service name
   * @param serviceKey - Secret key
   * @param body - Optional request body
   * @returns Authentication headers
   */
  static generateAuthHeadersWithLogging(
    method: string,
    path: string,
    serviceName: string,
    serviceKey: string,
    body?: any,
  ): Record<string, string> {
    const headers = this.generateAuthHeaders(method, path, serviceName, serviceKey, body);

    this.logger.debug(`Generated HMAC auth headers for ${method} ${path}`, {
      serviceName,
      timestamp: headers[INTERNAL_AUTH_HEADERS.TIMESTAMP],
      nonce: headers[INTERNAL_AUTH_HEADERS.NONCE],
    });

    return headers;
  }
}
