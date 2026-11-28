import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { tokenStorage, tokenRefreshService, resetSession } from '@verichron/auth-utils';
import router from './router.js';
import { updateApiClientTokens } from '@/shared/services/apiClient';
import { authService } from '@/shared/services/authService';
import { useUserStore } from '@/shared/store/userStore';
import { TeamProvider } from '@/shared/contexts/TeamContext';
import { RealtimeProvider } from '@/shared/contexts/RealtimeContext';
import './theme.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function handleAuthenticationFailure(context: string, error: Error) {
  console.error(`Authentication failure during ${context}:`, error);
  useUserStore.getState().clearUser();
  resetSession();
  window.location.href = import.meta.env.VITE_AUTH_URL || 'http://localhost:5173/login';
}

function App() {
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const { setUserFromToken, clearUser } = useUserStore();

  useEffect(() => {
    async function restoreSession() {
      const hash = window.location.hash;
      const tokenMatch = /#token=([^&]+)/.exec(hash);
      const refreshMatch = /&refresh=([^&]+)/.exec(hash);

      if (tokenMatch) {
        const accessToken = decodeURIComponent(tokenMatch[1]);
        const refreshToken = refreshMatch ? decodeURIComponent(refreshMatch[1]) : null;
        window.history.replaceState(null, '', window.location.pathname);
        setUserFromToken(accessToken);

        if (refreshToken) {
          tokenStorage.saveTokens({ accessToken, refreshToken }, true);
          tokenRefreshService.start(accessToken, {
            onRefresh: async (rt: string) => {
              const refreshedTokens = await authService.refreshToken(rt);
              updateApiClientTokens(refreshedTokens.accessToken);
              setUserFromToken(refreshedTokens.accessToken);
              return refreshedTokens;
            },
            onRefreshFailure: (error: Error) => handleAuthenticationFailure('background refresh', error),
          });
        } else {
          tokenStorage.updateAccessToken(accessToken);
        }
        updateApiClientTokens(accessToken);
        setIsRestoringSession(false);
        return;
      }

      const existingToken = tokenStorage.getAccessToken();
      if (existingToken) {
        setUserFromToken(existingToken);

        // Start token refresh if we have a refresh token
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          tokenRefreshService.start(existingToken, {
            onRefresh: async (rt: string) => {
              const refreshedTokens = await authService.refreshToken(rt);
              updateApiClientTokens(refreshedTokens.accessToken);
              setUserFromToken(refreshedTokens.accessToken);
              return refreshedTokens;
            },
            onRefreshFailure: (error: Error) => handleAuthenticationFailure('background refresh', error),
          });
        }

        setIsRestoringSession(false);
        return;
      }

      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        clearUser();
        setIsRestoringSession(false);
        return;
      }

      try {
        const newTokens = await authService.refreshToken(refreshToken);
        tokenStorage.saveTokens(newTokens, true);
        updateApiClientTokens(newTokens.accessToken);
        setUserFromToken(newTokens.accessToken);

        tokenRefreshService.start(newTokens.accessToken, {
          onRefresh: async (rt: string) => {
            const refreshedTokens = await authService.refreshToken(rt);
            updateApiClientTokens(refreshedTokens.accessToken);
            setUserFromToken(refreshedTokens.accessToken);
            return refreshedTokens;
          },
          onRefreshFailure: (error: Error) => handleAuthenticationFailure('background refresh', error),
        });
      } catch (error) {
        console.warn('Could not restore session:', error);
        clearUser();
        tokenStorage.clearTokens();
      } finally {
        setIsRestoringSession(false);
      }
    }
    restoreSession();
  }, [setUserFromToken, clearUser]);

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
    <QueryClientProvider client={queryClient}>
      <TeamProvider>
        <RealtimeProvider>
          <RouterProvider router={router} />
        </RealtimeProvider>
      </TeamProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);