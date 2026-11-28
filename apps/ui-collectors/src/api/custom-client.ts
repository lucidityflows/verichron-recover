import type { AxiosRequestConfig, AxiosResponse, AxiosError } from '@verichron/api-client';
import {
  usersApiClient,
  organizationsApiClient,
  debtsApiClient,
  debtorsApiClient,
  transactionsApiClient,
  collectorsApiClient,
  communicationsApiClient,
  workflowsApiClient,
  automationsApiClient,
  auditsApiClient,
  voiceApiClient,
} from '../shared/services/apiClient';
import { tokenStorage } from '@verichron/auth-utils';

export interface ApiErrorResponse {
  message: string;
  statusCode?: number;
  error?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Custom Axios instance for Orval-generated API calls.
 * This function adapts to the `(url, config)` signature from Orval,
 * routes to the appropriate API client, injects the auth token, and transforms errors.
 */
export const customInstance = async <T>(
  url: string,
  config: RequestInit,
): Promise<T> => {
  const { body, headers, signal, ...rest } = config;

  // Determine which API client to use based on URL namespace
  let client;
  
  // Extract segments and handle the 4-lane structure
  const segments = url.split('/').filter(Boolean);
  const lanes = ['v1', 'ops', 'public', 'internal'];
  
  // If the first segment is a lane, the second segment is the microservice namespace
  const effectiveNamespace = lanes.includes(segments[0]) ? segments[1] : segments[0];

  switch (effectiveNamespace) {
    case 'users':
    case 'auth':
      client = usersApiClient;
      break;
    case 'organizations':
    case 'onboarding':
      client = organizationsApiClient;
      break;
    case 'audits':
      client = auditsApiClient;
      break;
    case 'debts':
      client = debtsApiClient;
      break;
    case 'debtors':
      client = debtorsApiClient;
      break;
    case 'transactions':
      client = transactionsApiClient;
      break;
    case 'communications':
      client = communicationsApiClient;
      break;
    case 'collectors':
      client = collectorsApiClient;
      break;
    case 'voice':
      client = voiceApiClient;
      break;
    case 'workflows':
      client = workflowsApiClient;
      break;
    case 'automations':
      client = automationsApiClient;
      break;
    default:
      client = organizationsApiClient;
      break;
  }

  const axiosConfig: AxiosRequestConfig = {
    url,
    headers: headers as AxiosRequestConfig['headers'],
    // Map RequestInit's body to Axios's data for POST/PUT/PATCH
    data: body,
    signal: signal!,
    ...rest,
  };

  // If body is FormData, override Content-Type to let Axios set multipart boundary
  if (body instanceof FormData) {
    axiosConfig.headers = {
      ...axiosConfig.headers,
      'Content-Type': undefined, // Explicitly undefined to override instance defaults
    };
  }

  try {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        Authorization: `Bearer ${accessToken}`,
      };
    }

    const response: AxiosResponse<T> = await client.request<T>(axiosConfig);

    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
    } as unknown as T;
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
