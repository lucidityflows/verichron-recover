import { tokenRefreshService } from './TokenRefreshService';
import { tokenStorage } from './TokenStorage';

/**
 * Resets the current session by clearing all tokens from storage and stopping the auto-refresh service.
 * This is the standard procedure to force a user to re-authenticate.
 */
export function resetSession(): void {
  tokenRefreshService.stop();
  tokenStorage.clearTokens();
}
