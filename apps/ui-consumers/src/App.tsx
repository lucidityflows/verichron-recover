/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import router from './router.js';
import { tokenStorage, tokenRefreshService, resetSession } from '@verichron/auth-utils';
import { updateApiClientTokens } from './shared/services/apiClient.js';
import { authService } from './shared/services/authService.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function handleAuthenticationFailure(context: string, error: Error) {
  console.error(`Authentication failure during ${context}:`, error);
  resetSession();
  window.location.href = import.meta.env.VITE_AUTH_URL || 'http://localhost:5173/login';
}

function App() {
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      // Check if tokens were passed via URL hash (redirect from ui-auth)
      const hash = window.location.hash;
      const tokenMatch = /#token=([^&]+)/.exec(hash);
      const refreshMatch = /&refresh=([^&]+)/.exec(hash);

      if (tokenMatch) {
        const accessToken = decodeURIComponent(tokenMatch[1]);
        const refreshToken = refreshMatch ? decodeURIComponent(refreshMatch[1]) : null;

        // Clear the tokens from URL for security
        window.history.replaceState(null, '', window.location.pathname);

        // Save tokens
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
          tokenStorage.updateAccessToken(accessToken);
        }

        // Set token on API clients
        updateApiClientTokens(accessToken);

        setIsRestoringSession(false);
        return;
      }

      // Check if we already have an access token
      const existingToken = tokenStorage.getAccessToken();
      if (existingToken) {
        updateApiClientTokens(existingToken);

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

      // No stored tokens, check for refresh token from previous session
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        try {
          const newTokens = await authService.refreshToken(refreshToken);
          tokenStorage.saveTokens(newTokens, true);
          updateApiClientTokens(newTokens.accessToken);

          tokenRefreshService.start(newTokens.accessToken, {
            onRefresh: async (rt: string) => {
              const refreshedTokens = await authService.refreshToken(rt);
              updateApiClientTokens(refreshedTokens.accessToken);
              return refreshedTokens;
            },
            onRefreshFailure: (error: Error) => handleAuthenticationFailure('background refresh', error),
          });
        } catch (error) {
          console.warn('Could not restore session from refresh token:', error);
          tokenStorage.clearTokens();
        }
      }

      setIsRestoringSession(false);
    }

    void restoreSession();
  }, []);

  // Show loading state while checking for existing session
  if (isRestoringSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Restoring your session...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
