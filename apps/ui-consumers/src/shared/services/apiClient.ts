/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unused-vars */
import { ApiClient } from '@verichron/api-client';

/**
 * Pre-configured API clients for different microservices
 */

// Users API - manages authentication, users, roles
export const usersApiClient = new ApiClient(
  import.meta.env.VITE_API_USERS_URL || '/api/users'
);

// Debtors API - manages debtor profiles, verification, demographics
export const debtorsApiClient = new ApiClient(
  import.meta.env.VITE_API_DEBTORS_URL || '/api/debtors'
);

// Debts API - manages debts, portfolios, ownership
export const debtsApiClient = new ApiClient(
  import.meta.env.VITE_API_DEBTS_URL || '/api/debts'
);

// Transactions API - manages payments, plans, documents
export const transactionsApiClient = new ApiClient(
  import.meta.env.VITE_API_TRANSACTIONS_URL || '/api/transactions'
);

export const organizationsApiClient = new ApiClient(
  import.meta.env.VITE_API_ORGANIZATIONS_URL || '/api/organizations'
);

export const communicationsApiClient = new ApiClient(
  import.meta.env.VITE_API_COMMUNICATIONS_URL || '/api/communications'
);

export const collectorsApiClient = new ApiClient(
  import.meta.env.VITE_API_COLLECTORS_URL || '/api/collectors'
);

export const voiceApiClient = new ApiClient(
  import.meta.env.VITE_API_VOICE_URL || '/api/voice'
);

export const workflowsApiClient = new ApiClient(
  import.meta.env.VITE_API_WORKFLOWS_URL || '/api/workflows'
);

export const automationsApiClient = new ApiClient(
  import.meta.env.VITE_API_AUTOMATIONS_URL || '/api/automations'
);

export const auditsApiClient = new ApiClient(
  import.meta.env.VITE_API_AUDITS_URL || '/api/audits'
);

/**
 * Update access tokens for all API clients
 */
export function updateApiClientTokens(accessToken: string) {
  usersApiClient.setAuthToken(accessToken);
  debtorsApiClient.setAuthToken(accessToken);
  debtsApiClient.setAuthToken(accessToken);
  transactionsApiClient.setAuthToken(accessToken);
  organizationsApiClient.setAuthToken(accessToken);
  communicationsApiClient.setAuthToken(accessToken);
  collectorsApiClient.setAuthToken(accessToken);
  voiceApiClient.setAuthToken(accessToken);
  workflowsApiClient.setAuthToken(accessToken);
  automationsApiClient.setAuthToken(accessToken);
  auditsApiClient.setAuthToken(accessToken);
}