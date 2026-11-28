import { AxiosInstance } from 'axios';
import axios from 'axios';
import ApiClient from './client';

export function createConfiguredApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add any interceptors or default configurations here if needed
  // For example, client.interceptors.request.use(...)

  return client;
}

// Export the class for custom instances if needed
export { ApiClient };

// Export types
export * from './types';