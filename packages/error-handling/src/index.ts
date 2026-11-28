/**
 * @verichron/error-handling
 *
 * Standardized error handling package for Verichron monorepo.
 * Provides consistent error structures and handling across all microservices.
 */

// Core exception class
export { BaseException } from './base.exception';

// Error response interface
export type { ErrorResponse } from './error-response.interface';

// Global exception filter
export { GlobalHttpExceptionFilter } from './http-exception.filter';
export { handleServiceError } from './utils/handle-service-error';
