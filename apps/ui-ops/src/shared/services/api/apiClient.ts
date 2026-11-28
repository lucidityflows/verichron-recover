import { createConfiguredApiClient } from '@verichron/api-client';

// Example usage for platform-specific API calls
// This will be replaced by domain-specific service files later
export const platformApiClient = createConfiguredApiClient(import.meta.env.VITE_API_PLATFORM_URL || '/api/platform');