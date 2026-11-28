import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * InternalApiKeyGuard
 *
 * Protects internal service-to-service endpoints using API key authentication.
 * Used for endpoints that should only be accessible by other Verichron microservices.
 *
 * **Usage:**
 * Apply `@UseGuards(InternalApiKeyGuard)` to controllers or routes that should
 * only be accessible via internal service calls.
 *
 * **Authentication:**
 * - Expects `X-Internal-API-Key` header with valid API key
 * - API key configured via `INTERNAL_API_KEY` environment variable
 * - Returns 401 Unauthorized if key is missing or invalid
 *
 * **Example:**
 * ```typescript
 * import { InternalApiKeyGuard } from '@verichron/auth';
 *
 * @Controller('internal/analytics')
 * @UseGuards(InternalApiKeyGuard)
 * export class InternalAnalyticsController {
 *   @Get('dashboard-summary/:orgId')
 *   async getDashboardSummary(@Param('orgId') orgId: string) {
 *     // Only accessible with valid internal API key
 *   }
 * }
 * ```
 *
 * **Security Notes:**
 * - Internal API key should be rotated regularly
 * - Use different keys per environment (dev/staging/prod)
 * - Never log the actual API key value
 * - Consider implementing rate limiting for internal endpoints
 *
 * **Environment Configuration:**
 * Set `INTERNAL_API_KEY` in your environment:
 * - Development: Use a simple key for local testing
 * - Production: Use a strong, randomly generated key (min 32 chars)
 * - Kubernetes: Store in Secret and inject as env var
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(InternalApiKeyGuard.name);
  private readonly internalApiKey: string;

  constructor(private reflector: Reflector) {
    this.internalApiKey = process.env.INTERNAL_API_KEY || '';

    if (!this.internalApiKey) {
      this.logger.warn(
        'INTERNAL_API_KEY environment variable is not set. Internal endpoints will be inaccessible.',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // If no internal API key configured, deny all requests (fail-secure)
    if (!this.internalApiKey) {
      this.logger.error('Internal API key not configured - denying request');
      throw new UnauthorizedException(
        'Internal API access is not configured',
      );
    }

    const request = context.switchToHttp().getRequest();
    const providedApiKey = request.headers['x-internal-api-key'];

    if (!providedApiKey) {
      this.logger.warn('Internal API request missing X-Internal-API-Key header', {
        path: request.url,
        method: request.method,
        ip: request.ip,
      });
      throw new UnauthorizedException('Internal API key required');
    }

    // Constant-time comparison to prevent timing attacks
    if (!this.secureCompare(providedApiKey, this.internalApiKey)) {
      this.logger.warn('Internal API request with invalid API key', {
        path: request.url,
        method: request.method,
        ip: request.ip,
        // DO NOT log the actual key values
      });
      throw new UnauthorizedException('Invalid internal API key');
    }

    this.logger.debug('Internal API request authenticated successfully', {
      path: request.url,
      method: request.method,
    });

    return true;
  }

  /**
   * Constant-time string comparison to prevent timing attacks.
   *
   * Compares two strings in a way that takes the same amount of time
   * regardless of where the first difference occurs.
   *
   * @param a - First string to compare
   * @param b - Second string to compare
   * @returns True if strings are equal
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return mismatch === 0;
  }
}
