import type { IAuthTokenResponse } from './auth-token-response.interface';

/**
 * TokenStorage
 *
 * Manages secure storage of authentication tokens with hybrid approach:
 * - Memory-only by default (cleared on page refresh)
 * - localStorage for "Remember Me" functionality (persists across sessions)
 *
 * Security Considerations:
 * - Access tokens: Always memory-only (short-lived, high-privilege)
 * - Refresh tokens: Memory by default, localStorage only if user opts in
 * - localStorage keys prefixed with app namespace to avoid collisions
 */

const STORAGE_PREFIX = 'dls_auth';
const REFRESH_TOKEN_KEY = `${STORAGE_PREFIX}_refresh_token`;

interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
}

class TokenStorageService {
  private memoryTokens: TokenState = {
    accessToken: null,
    refreshToken: null,
  };

  /**
   * Save authentication tokens
   *
   * @param tokens - Access and refresh tokens from authentication response
   * @param rememberMe - If true, persist refresh token to localStorage
   *
   * @example
   * ```typescript
   * // Session-only (cleared on browser close)
   * tokenStorage.saveTokens(tokens, false);
   *
   * // Persistent (survives browser restart)
   * tokenStorage.saveTokens(tokens, true);
   * ```
   */
  saveTokens(tokens: IAuthTokenResponse, rememberMe = false): void {
    // Always store access token in memory only (never persisted)
    this.memoryTokens.accessToken = tokens.accessToken;
    this.memoryTokens.refreshToken = tokens.refreshToken;

    if (rememberMe) {
      // Persist refresh token for auto-login on next session
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } else {
      // Clear any previously stored refresh token
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  /**
   * Get current access token (always from memory)
   *
   * @returns Access token or null if not authenticated
   */
  getAccessToken(): string | null {
    return this.memoryTokens.accessToken;
  }

  /**
   * Get refresh token from memory or localStorage
   *
   * @returns Refresh token or null if not available
   *
   * Priority:
   * 1. Memory (current session)
   * 2. localStorage (previous session with "Remember Me")
   */
  getRefreshToken(): string | null {
    // Check memory first (current session)
    if (this.memoryTokens.refreshToken) {
      return this.memoryTokens.refreshToken;
    }

    // Fall back to localStorage (persisted from previous session)
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Check if user has valid tokens (in memory or localStorage)
   *
   * @returns True if either access token or refresh token exists
   */
  hasTokens(): boolean {
    return !!(this.memoryTokens.accessToken ?? this.getRefreshToken());
  }

  /**
   * Clear all tokens (memory and localStorage)
   *
   * Call this on:
   * - Explicit logout
   * - Token refresh failure
   * - Session expired
   *
   * @example
   * ```typescript
   * // User clicks logout
   * tokenStorage.clearTokens();
   * ```
   */
  clearTokens(): void {
    this.memoryTokens.accessToken = null;
    this.memoryTokens.refreshToken = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Update only the access token (used after refresh)
   *
   * @param accessToken - New access token from refresh response
   *
   * @example
   * ```typescript
   * // After calling /auth/refresh
   * const newTokens = await authService.refreshToken(oldRefreshToken);
   * tokenStorage.saveTokens(newTokens, wasRememberMeEnabled);
   * ```
   */
  updateAccessToken(accessToken: string): void {
    this.memoryTokens.accessToken = accessToken;
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorageService();
