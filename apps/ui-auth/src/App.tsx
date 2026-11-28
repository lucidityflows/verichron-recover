// apps/ui-auth/src/App.tsx
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import router from './router';
import { tokenStorage, tokenRefreshService } from '@verichron/auth-utils';
import { authService } from './services/authService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

function App() {
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      // Check if user has a persisted refresh token from previous session
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        setIsRestoringSession(false);
        return;
      }

      try {
        console.log('Attempting to restore session...');

        // Attempt to refresh with stored token
        const newTokens = await authService.refreshToken(refreshToken);

        // Save new tokens (preserve "remember me" state since we had a stored token)
        tokenStorage.saveTokens(newTokens, true);

        // Start automatic refresh
        tokenRefreshService.start(newTokens.accessToken, {
          onRefresh: async (rt) => authService.refreshToken(rt),
          onRefreshFailure: (error) => {
            console.error('Session refresh failed:', error);
            tokenStorage.clearTokens();
            // User will be redirected to login by router's protected routes
          },
        });

        console.log('Session restored successfully');
      } catch (error) {
        // Refresh token expired or invalid, clear it
        console.warn('Could not restore session:', error);
        tokenStorage.clearTokens();
      } finally {
        setIsRestoringSession(false);
      }
    }

    void restoreSession();
  }, []);

  // Show loading state while checking for existing session
  if (isRestoringSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Restoring your session...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;