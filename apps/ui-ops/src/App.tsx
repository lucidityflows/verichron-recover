import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import router from './router.js';
import { tokenStorage, tokenRefreshService, resetSession } from '@verichron/auth-utils';
import { authService } from './shared/services/authService.js';
import { updateApiClientTokens } from './shared/services/apiClient.js';
import { ErrorBoundary } from './shared/components/ErrorBoundary.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Handles all authentication failures by clearing storage and redirecting to login.
 * @param context A string describing where the failure occurred, for logging.
 * @param error The error object.
 */
function handleAuthenticationFailure(context: string, error: Error) {
  console.error(`Authentication failure during ${context}:`, error);
  resetSession(); // Use the generic utility
  // Perform the application-specific redirect
  window.location.href = import.meta.env.VITE_AUTH_URL || 'http://localhost:5173/login';
}

function App() {
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const hash = window.location.hash;
      const tokenMatch = hash.match(/#token=([^&]+)/);
      const refreshMatch = hash.match(/&refresh=([^&]+)/);

      // Case 1: Tokens provided via URL hash (successful login redirect)
      if (tokenMatch) {
        const accessToken = decodeURIComponent(tokenMatch[1]);
        const refreshToken = refreshMatch ? decodeURIComponent(refreshMatch[1]) : null;

        console.log('Received tokens from redirect, initializing session...');

        // Clear the tokens from URL for security
        window.history.replaceState(null, '', window.location.pathname);

        // Save tokens (full session if refresh token provided)
        if (refreshToken) {
          tokenStorage.saveTokens({ accessToken, refreshToken }, true);

          // Start automatic refresh
          tokenRefreshService.start(accessToken, {
            onRefresh: async (rt: string) => {
              const refreshedTokens = await authService.refreshToken(rt);
              updateApiClientTokens(refreshedTokens.accessToken);
              return refreshedTokens;
            },
            onRefreshFailure: (error: Error) => handleAuthenticationFailure('background refresh', error),
          });
        } else {
          // Only access token, store in memory (session-only)
          tokenStorage.updateAccessToken(accessToken);
        }

        // Set token on API clients
        updateApiClientTokens(accessToken);

        console.log('Session initialized from redirect');
        setIsRestoringSession(false);
        return;
      }

      // Case 2: Check if we already have an access token (prevents double initialization in StrictMode)
      const existingToken = tokenStorage.getAccessToken();
      if (existingToken) {
        console.log('Session already initialized');

        // Start token refresh if we have a refresh token
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          tokenRefreshService.start(existingToken, {
            onRefresh: async (rt: string) => {
              const refreshedTokens = await authService.refreshToken(rt);
              updateApiClientTokens(refreshedTokens.accessToken);
              return refreshedTokens;
            },
            onRefreshFailure: (error: Error) => handleAuthenticationFailure('background refresh', error),
          });
        }

        setIsRestoringSession(false);
        return;
      }

      // Case 3: Check if user has a persisted refresh token from previous session
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        console.log('No stored refresh token, user needs to log in');
        setIsRestoringSession(false);
        return;
      }

      try {
        console.log('Attempting to restore session from stored refresh token...');

        // Attempt to refresh with stored token
        const newTokens = await authService.refreshToken(refreshToken);

        // Save new tokens (preserve "remember me" state since we had a stored token)
        tokenStorage.saveTokens(newTokens, true);

        // Update API client tokens
        updateApiClientTokens(newTokens.accessToken);

        // Start automatic refresh
        tokenRefreshService.start(newTokens.accessToken, {
          onRefresh: async (rt: string) => {
            const refreshedTokens = await authService.refreshToken(rt);
            updateApiClientTokens(refreshedTokens.accessToken);
            return refreshedTokens;
          },
          onRefreshFailure: (error: Error) => handleAuthenticationFailure('background refresh', error),
        });

        console.log('Session restored successfully');
      } catch (error) {
        // Refresh token expired or invalid, clear it
        console.warn('Could not restore session from refresh token:', error);
        tokenStorage.clearTokens();
        // Don't redirect here - just clear tokens and let the router handle auth
      } finally {
        setIsRestoringSession(false);
      }
    }

    restoreSession();
  }, []);

  // Show loading state while checking for existing session
  if (isRestoringSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-600"></div>
          <p className="text-sm font-medium text-slate-400">Restoring session...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
