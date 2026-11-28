/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/prefer-nullish-coalescing */
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from '@verichron/api-client';
import { authApiClient } from '../client/apiClient';
import { tokenStorage } from '@verichron/auth-utils';

export interface ApiErrorResponse {
  message: string;
  statusCode?: number;
  error?: string;
  [key: string]: any;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Custom Axios instance for Orval-generated API calls.
 * This function adapts to the `(url, config)` signature from Orval,
 * injects the auth token, and transforms errors.
 */
export const customInstance = async <T>(
  url: string,
  config: RequestInit,
): Promise<T> => {
  const { body, headers, signal, ...rest } = config;

  const axiosConfig: AxiosRequestConfig = {
    url,
    headers: headers as AxiosRequestConfig['headers'],
    // Map RequestInit's body to Axios's data for POST/PUT/PATCH
    data: body,
    signal: signal as any,
    ...rest,
  };

  try {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        Authorization: `Bearer ${accessToken}`,
      };
    }

    const response: AxiosResponse<T> = await authApiClient.request<T>(axiosConfig);
    
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    
    // Transform to consistent error format
    throw new ApiError(
      axiosError.response?.data?.message || 
      axiosError.message || 
      'An unexpected error occurred',
      axiosError.response?.status,
      axiosError.response?.data,
    );
  }
};

export default customInstance;