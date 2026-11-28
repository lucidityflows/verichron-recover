import { AxiosError, AxiosResponse } from 'axios';

// Common API response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Common error response
export interface ApiErrorResponse {
  message: string;
  statusCode: number;
  error?: string;
}

// Type guard for API errors
export function isApiError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (error as AxiosError).isAxiosError === true;
}

// Extract data from response
export function extractData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  return response.data.data;
}

// Re-export axios types that consumers might need
export type { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';