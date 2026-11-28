/**
 * @verichron/auth-utils
 *
 * Shared authentication utilities for Verichron microfrontends
 *
 * Provides:
 * - TokenStorage: Hybrid token storage (memory + localStorage)
 * - TokenRefreshService: Automatic JWT refresh before expiration
 *
 * Usage:
 * 1. After login: Save tokens and start auto-refresh
 * 2. On app load: Restore session if refresh token exists
 * 3. On logout: Stop refresh and clear tokens
 */

export { tokenStorage } from './TokenStorage';
export { tokenRefreshService } from './TokenRefreshService';
export { resetSession } from './session';

