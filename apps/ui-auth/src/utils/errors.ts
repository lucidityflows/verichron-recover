/**
 * Type-safe error handling utilities
 */

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  message: string | string[];
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
 * Extract a user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  // Handle null/undefined
  if (!error) return fallback;

  // Handle Axios/Request errors (assuming standard structure)
  const anyError = error as any;
  
  if (anyError.response?.data) {
    const responseData = anyError.response.data;
    const responseMessage = responseData.message;
    
    if (responseMessage) {
      if (Array.isArray(responseMessage)) {
        return responseMessage.join(', ');
      }
      return responseMessage;
    }

    const errorMessage = responseData.error;
    if (errorMessage) return errorMessage;
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
