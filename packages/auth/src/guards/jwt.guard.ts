import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators';
import { UnauthorizedException } from '@nestjs/common';
import {
  HmacSigner,
  INTERNAL_AUTH_HEADERS,
  MAX_TIME_DRIFT_MS,
  NONCE_TTL_MS,
} from '@verichron/security';

/**
 * JWT Authentication Guard
 * 
 * Validates JWT tokens for all non-public routes.
 * Also supports HMAC-based service-to-service authentication.
 * Supports platform admins with NULL organizationId.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  // In-memory nonce cache
  // TODO: Replace with Redis for multi-instance support in production
  private readonly nonceCache = new Set<string>();

  // Service-specific API keys for HMAC authentication
  // These map to environment variables for internal authentication
  private readonly serviceKeys: Record<string, string | undefined> = {
    'api-organizations': process.env.SERVICE_KEY_ORGANIZATIONS,
    'api-users': process.env.SERVICE_KEY_USERS,
    'api-debts': process.env.SERVICE_KEY_DEBTS,
    'api-debtors': process.env.SERVICE_KEY_DEBTORS,
    'api-transactions': process.env.SERVICE_KEY_TRANSACTIONS,
    'api-communications': process.env.SERVICE_KEY_COMMUNICATIONS,
    'api-collectors': process.env.SERVICE_KEY_COLLECTORS,
    'api-automations': process.env.SERVICE_KEY_AUTOMATIONS,
    'api-voice': process.env.SERVICE_KEY_VOICE,
    'api-workflows': process.env.SERVICE_KEY_WORKFLOWS,
    'e2e-tester': process.env.INTERNAL_API_KEY || 'test-api-key', // For E2E testing
  };

  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Check for internal service authentication (HMAC-based)
    if (this.hasInternalAuthHeaders(request)) {
      return this.validateInternalAuth(request);
    }

    // Validate JWT using JwtStrategy
    return super.canActivate(context) as Promise<boolean>;
  }

  /**
   * Handle authentication request
   * Attaches user payload to request.user
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or missing authentication token');
    }

    // User payload from JwtStrategy is attached to request
    // Contains: sub, userType, and claims namespace with organizationId (or null) and permissions
    return user;
  }

  /**
   * Checks if request has all required HMAC authentication headers
   */
  private hasInternalAuthHeaders(request: any): boolean {
    const headers = request.headers;
    return !!(
      headers[INTERNAL_AUTH_HEADERS.SERVICE_NAME] &&
      headers[INTERNAL_AUTH_HEADERS.TIMESTAMP] &&
      headers[INTERNAL_AUTH_HEADERS.NONCE] &&
      headers[INTERNAL_AUTH_HEADERS.SIGNATURE]
    );
  }

  /**
   * Validates internal service-to-service authentication using HMAC
   */
  private validateInternalAuth(request: any): boolean {
    const serviceName = request.headers[INTERNAL_AUTH_HEADERS.SERVICE_NAME];
    const timestampStr = request.headers[INTERNAL_AUTH_HEADERS.TIMESTAMP];
    const nonce = request.headers[INTERNAL_AUTH_HEADERS.NONCE];
    const signature = request.headers[INTERNAL_AUTH_HEADERS.SIGNATURE];

    const timestamp = parseInt(timestampStr, 10);

    // 1. Validate timestamp (replay protection)
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    if (timeDiff > MAX_TIME_DRIFT_MS) {
      this.logger.warn({
        event: 'internal_auth_failed',
        reason: 'timestamp_too_old',
        serviceName,
        timeDiff,
      });
      return false;
    }

    // 2. Validate nonce (replay protection)
    if (this.nonceCache.has(nonce)) {
      this.logger.warn({
        event: 'internal_auth_failed',
        reason: 'nonce_reuse_detected',
        serviceName,
        nonce,
      });
      return false;
    }

    // 3. Get service-specific key
    const serviceKey = this.serviceKeys[serviceName];
    if (!serviceKey) {
      this.logger.warn({
        event: 'internal_auth_failed',
        reason: 'unknown_service',
        serviceName,
      });
      return false;
    }

    // 4. Verify HMAC signature
    // For GET/DELETE requests with no body, use empty string
    const hasBody = request.body && Object.keys(request.body).length > 0;
    const body = hasBody ? JSON.stringify(request.body) : '';

    // Use request.originalUrl to include query string if present
    const path = request.originalUrl;

    const isValid = HmacSigner.verify(
      request.method,
      path,
      body,
      serviceKey,
      timestamp,
      nonce,
      signature
    );

    if (!isValid) {
      const expected = HmacSigner.sign(request.method, path, body, serviceKey, timestamp, nonce);
      this.logger.error(`[HMAC DEBUG] Validation Failed. Path: "${path}", Expected: ${expected}, Got: ${signature}, Service: ${serviceName}`);
      
      this.logger.warn({
        event: 'internal_auth_failed',
        reason: 'invalid_signature',
        serviceName,
        method: request.method,
        path,
      });
      return false;
    }

    // 5. Success
    this.nonceCache.add(nonce);
    setTimeout(() => this.nonceCache.delete(nonce), NONCE_TTL_MS);

    // Set service context for downstream guards/services
    request.serviceAccount = {
      name: serviceName,
      authenticatedAt: new Date().toISOString(),
    };

    this.logger.debug({
      event: 'internal_auth_success',
      serviceName,
      endpoint: `${request.method} ${path}`,
    });

    return true;
  }
}