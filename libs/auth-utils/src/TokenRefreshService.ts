import { jwtDecode } from 'jwt-decode';
import type { IAuthTokenResponse } from './auth-token-response.interface';
import { tokenStorage } from './TokenStorage';

/**
 * TokenRefreshService
 *
 * Automatically refreshes access tokens before expiration to maintain
 * seamless user sessions without interruption.
 *
 * Features:
 * - Decodes JWT to calculate exact expiration time
 * - Schedules refresh 5 minutes before token expires
 * - Recursive refresh (automatically schedules next refresh after success)
 * - Graceful failure handling with callback support
 *
 * Usage:
 * 1. Start auto-refresh after successful login
 * 2. Stop auto-refresh on logout
 * 3. Provide refresh callback that calls your auth service
 */

interface JwtPayload {
  exp: number; // Expiration timestamp (seconds since epoch)
  iat?: number; // Issued at timestamp
  sub?: string; // Subject (user ID)
  [key: string]: unknown; // Other custom claims
}

interface TokenRefreshCallbacks {
  /**
   * Function to call when refresh is needed
   * Should call your auth service's refreshToken endpoint
   */
  onRefresh: (refreshToken: string) => Promise<IAuthTokenResponse>;

  /**
   * Function to call when refresh fails
   * Typically should log user out and redirect to login
   */
  onRefreshFailure?: (error: Error) => void;
}

// Refresh 5 minutes before expiration
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Minimum time to wait before refresh (prevents immediate refresh if token is already near expiry)
const MIN_REFRESH_DELAY_MS = 10 * 1000; // 10 seconds

class TokenRefreshServiceClass {
  private refreshTimer: NodeJS.Timeout | null = null;
  private callbacks: TokenRefreshCallbacks | null = null;
  private isRefreshing = false;

  /**
   * Initialize and start automatic token refresh
   *
   * @param accessToken - Current access token to decode for expiration
   * @param callbacks - Callbacks for refresh success and failure
   *
   * @example
   * ```typescript
   * // After successful login
   * tokenRefreshService.start(tokens.accessToken, {
   *   onRefresh: async (refreshToken) => {
   *     return await authService.refreshToken(refreshToken);
   *   },
   *   onRefreshFailure: (error) => {
   *     console.error('Session expired:', error);
   *     navigate('/login');
   *   }
   * });
   * ```
   */
  start(accessToken: string, callbacks: TokenRefreshCallbacks): void {
    this.callbacks = callbacks;
    this.scheduleRefresh(accessToken);
  }

  /**
   * Stop automatic token refresh and clear timer
   *
   * Call this on logout or when user session ends
   *
   * @example
   * ```typescript
   * // User clicks logout
   * tokenRefreshService.stop();
   * tokenStorage.clearTokens();
   * ```
   */
  stop(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.callbacks = null;
    this.isRefreshing = false;
  }

  /**
   * Check if auto-refresh is currently active
   *
   * @returns True if refresh timer is scheduled
   */
  isActive(): boolean {
    return this.refreshTimer !== null;
  }

  /**
   * Manually trigger token refresh (useful for testing or forcing refresh)
   *
   * @returns Promise resolving to new tokens or rejecting with error
   */
  async refreshNow(): Promise<IAuthTokenResponse | null> {
    if (!this.callbacks) {
      console.warn('TokenRefreshService: No callbacks configured');
      return null;
    }

    return this.performRefresh();
  }

  /**
   * Schedule the next token refresh based on access token expiration
   *
   * @private
   */
  private scheduleRefresh(accessToken: string): void {
    try {
      // Decode JWT to get expiration time
      const decoded = jwtDecode<JwtPayload>(accessToken);
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Calculate when to refresh (5 minutes before expiry)
      const refreshIn = timeUntilExpiry - REFRESH_BUFFER_MS;

      if (refreshIn <= 0) {
        // Token already expired or expires very soon, refresh immediately
        console.warn('TokenRefreshService: Token expires soon, refreshing immediately');
        void this.performRefresh();
        return;
      }

      // Ensure we don't schedule refresh too soon
      const delay = Math.max(refreshIn, MIN_REFRESH_DELAY_MS);

      // Clear any existing timer
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }

      // Schedule refresh
      this.refreshTimer = setTimeout(() => {
        void this.performRefresh();
      }, delay);

      // Debug logging
      const refreshTime = new Date(now + delay);
      console.log(`TokenRefreshService: Next refresh scheduled for ${refreshTime.toISOString()} (in ${Math.round(delay / 1000)}s)`);
    } catch (error) {
      console.error('TokenRefreshService: Failed to decode access token', error);
      this.handleRefreshFailure(error as Error);
    }
  }

  /**
   * Perform the actual token refresh
   *
   * @private
   */
  private async performRefresh(): Promise<IAuthTokenResponse | null> {
    if (!this.callbacks) {
      console.error('TokenRefreshService: Cannot refresh, no callbacks configured');
      return null;
    }

    // Prevent concurrent refreshes
    if (this.isRefreshing) {
      console.warn('TokenRefreshService: Refresh already in progress, skipping');
      return null;
    }

    this.isRefreshing = true;

    try {
      // Get refresh token from storage
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log('TokenRefreshService: Refreshing access token...');

      // Call the refresh callback (should call authService.refreshToken)
      const newTokens = await this.callbacks.onRefresh(refreshToken);

      console.log('TokenRefreshService: Token refresh successful');

      // Update tokens in storage (preserve "remember me" state)
      const wasRemembered = !!localStorage.getItem('dls_auth_refresh_token');
      tokenStorage.saveTokens(newTokens, wasRemembered);

      // Schedule the next refresh with the new access token
      this.scheduleRefresh(newTokens.accessToken);

      return newTokens;
    } catch (error) {
      console.error('TokenRefreshService: Token refresh failed', error);
      this.handleRefreshFailure(error as Error);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Handle refresh failure
   *
   * @private
   */
  private handleRefreshFailure(error: Error): void {
    // Stop the refresh timer
    this.stop();

    // Call failure callback if provided
    if (this.callbacks?.onRefreshFailure) {
      this.callbacks.onRefreshFailure(error);
    } else {
      console.error('TokenRefreshService: No failure callback configured, session may be expired');
    }
  }
}

// Export singleton instance
export const tokenRefreshService = new TokenRefreshServiceClass();
