/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { ApiClient } from '@verichron/api-client';

// Create API clients for different microservices
export const usersApiClient = new ApiClient(
  import.meta.env.VITE_API_USERS_URL || 'http://localhost:3001'
);

export const organizationsApiClient = new ApiClient(
  import.meta.env.VITE_API_ORGANIZATIONS_URL || 'http://localhost:3002'
);

export const debtsApiClient = new ApiClient(
  import.meta.env.VITE_API_DEBTS_URL || 'http://localhost:3003'
);

export const debtorsApiClient = new ApiClient(
  import.meta.env.VITE_API_DEBTORS_URL || 'http://localhost:3004'
);

export const transactionsApiClient = new ApiClient(
  import.meta.env.VITE_API_TRANSACTIONS_URL || 'http://localhost:3005'
);

export const communicationsApiClient = new ApiClient(
  import.meta.env.VITE_API_COMMUNICATIONS_URL || 'http://localhost:3006'
);

export const collectorsApiClient = new ApiClient(
  import.meta.env.VITE_API_COLLECTORS_URL || 'http://localhost:3007'
);

export const voiceApiClient = new ApiClient(
  import.meta.env.VITE_API_VOICE_URL || 'http://localhost:3008'
);

export const workflowsApiClient = new ApiClient(
  import.meta.env.VITE_API_WORKFLOWS_URL || 'http://localhost:3009'
);

export const automationsApiClient = new ApiClient(
  import.meta.env.VITE_API_AUTOMATIONS_URL || 'http://localhost:3010'
);

export const auditsApiClient = new ApiClient(
  import.meta.env.VITE_API_AUDITS_URL || 'http://localhost:3012'
);

// Initialize auth tokens from storage on app load
function initializeAuthTokens() {
  usersApiClient.loadAuthFromStorage();
  organizationsApiClient.loadAuthFromStorage();
  debtsApiClient.loadAuthFromStorage();
  debtorsApiClient.loadAuthFromStorage();
  transactionsApiClient.loadAuthFromStorage();
  communicationsApiClient.loadAuthFromStorage();
  collectorsApiClient.loadAuthFromStorage();
  voiceApiClient.loadAuthFromStorage();
  workflowsApiClient.loadAuthFromStorage();
  automationsApiClient.loadAuthFromStorage();
  auditsApiClient.loadAuthFromStorage();
}

// Call on module load
initializeAuthTokens();

// Export function to update tokens when they refresh
export function updateApiClientTokens(accessToken: string) {
  usersApiClient.setAuthToken(accessToken);
  organizationsApiClient.setAuthToken(accessToken);
  debtsApiClient.setAuthToken(accessToken);
  debtorsApiClient.setAuthToken(accessToken);
  transactionsApiClient.setAuthToken(accessToken);
  communicationsApiClient.setAuthToken(accessToken);
  collectorsApiClient.setAuthToken(accessToken);
  voiceApiClient.setAuthToken(accessToken);
  workflowsApiClient.setAuthToken(accessToken);
  automationsApiClient.setAuthToken(accessToken);
  auditsApiClient.setAuthToken(accessToken);
}
