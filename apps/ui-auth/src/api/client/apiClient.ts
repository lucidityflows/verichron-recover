// apps/ui-auth/src/api/client/apiClient.ts
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { ApiClient, type AxiosInstance } from '@verichron/api-client';

const apiUsersUrl = import.meta.env.VITE_API_USERS_URL;

if (!apiUsersUrl) {
  throw new Error('VITE_API_USERS_URL is not defined. Please check your .env file.');
}

/**
 * Singleton ApiClient instance for the Users/Auth API
 * 
 * Note: We DON'T set auth tokens on this instance directly anymore.
 * Tokens are injected per-request in the custom-instance.ts mutator.
 * This prevents stale token issues.
 */
export const authClientInstance = new ApiClient(apiUsersUrl);

/**
 * Underlying Axios instance for direct use if needed
 * Prefer using the Orval-generated hooks/functions instead
 */
export const authApiClient: AxiosInstance = authClientInstance.getAxios();