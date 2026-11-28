import { createConfiguredApiClient } from '@verichron/api-client';

export const organizationsApiClient = createConfiguredApiClient(import.meta.env.VITE_API_ORGANIZATIONS_URL);
