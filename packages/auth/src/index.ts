/**
 * @verichron/auth - Shared Authentication & Authorization Infrastructure
 *
 * This package provides guards, decorators, and strategies for consistent
 * authentication and authorization across all Verichron microservices.
 *
 * @see /Centralized-Auth.md for architecture documentation
 *
 * SECURITY POLICY (Maximum Security - Zero Information Leakage):
 * - 400 Bad Request: Malformed requests (invalid UUIDs, etc.)
 * - 401 Unauthorized: Not authenticated (missing/invalid JWT)
 * - 404 Not Found: Resource doesn't exist OR user doesn't have access (NEVER reveal which)
 * - 403 Forbidden: Authenticated, in correct org, but lacks specific permission
 */

// Export guards
export * from './guards';

// Export decorators
export * from './decorators';

// Export strategies
export * from './strategies';

// Export errors
export * from './errors';
