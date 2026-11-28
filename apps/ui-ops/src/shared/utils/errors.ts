/**
 * Type-safe error handling utilities
 */

import { AxiosError } from '@verichron/api-client';

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  message: string;
  statusCode?: number;
  error?: string;
  details?: Record<string, any>;
  [key: string]: any;
}

/**
 * Custom API Error class with type safety
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: ApiErrorResponse,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Type guard to check if error is an Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as any).isAxiosError === true
  );
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Extract a user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  // Handle null/undefined
  if (!error) return fallback;

  // Handle ApiError
  if (isApiError(error)) {
    return error.message;
  }

  // Handle Axios errors
  if (isAxiosError(error)) {
    const responseData = error.response?.data;
    const responseMessage = responseData?.message;
    
    if (responseMessage) {
      if (Array.isArray(responseMessage)) {
        return responseMessage.join(', ');
      }
      return responseMessage;
    }

    const errorMessage = responseData?.error;
    if (errorMessage) return errorMessage;

    if (error.message) return error.message;
  }

  // Handle standard Error
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle object with message property
  if (typeof error === 'object' && 'message' in error) {
    const msg = (error as any).message;
    if (typeof msg === 'string') return msg;
  }

  return fallback;
}

/**
 * Extract HTTP status code from error
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (isApiError(error)) {
    return error.status;
  }

  if (isAxiosError(error)) {
    return error.response?.status;
  }

  return undefined;
}

/**
 * Format error for logging/debugging
 */
export function formatErrorForLogging(error: unknown): Record<string, any> {
  if (isApiError(error)) {
    return {
      type: 'ApiError',
      message: error.message,
      status: error.status,
      data: error.data,
    };
  }

  if (isAxiosError(error)) {
    return {
      type: 'AxiosError',
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
      },
    };
  }

  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    type: 'Unknown',
    value: error,
  };
}

/**
 * Check if error is a network error (no response from server)
 */
export function isNetworkError(error: unknown): boolean {
  if (isAxiosError(error)) {
    return !error.response && error.code !== 'ECONNABORTED';
  }
  return false;
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (isAxiosError(error)) {
    return error.code === 'ECONNABORTED';
  }
  return false;
}

/**
 * Check if error is an authentication error (401/403)
 */
export function isAuthError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 401 || status === 403;
}

/**
 * Check if error is a validation error (400/422)
 */
export function isValidationError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 400 || status === 422;
}

/**
 * Check if error is a server error (500+)
 */
export function isServerError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status !== undefined && status >= 500;
}
