/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/prefer-nullish-coalescing */
import { useEffect, useState } from 'react';
import { tokenStorage } from '@verichron/auth-utils';

const LOGIN_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:5173/login';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      // 1. Check for tokens in URL hash (redirect from ui-auth)
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = params.get('token');
      const refreshToken = params.get('refresh');

      if (accessToken) {
        // Save tokens from URL
        tokenStorage.saveTokens({
          accessToken,
          refreshToken: refreshToken || '',
        }, !!refreshToken); // Remember me if refresh token exists

        // Clean URL
        window.history.replaceState(null, '', window.location.pathname);
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // 2. Check existing session
      if (tokenStorage.hasTokens()) {
        setIsAuthenticated(true);
      } else {
        // Redirect to login
        window.location.href = LOGIN_URL;
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20"></div>
          <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}
