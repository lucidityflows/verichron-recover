// apps/ui-auth/src/features/auth/Login.tsx
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing */
import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { authService } from '../../services/authService';
import { authClientInstance } from '../../api/client/apiClient';
import { redirectService } from '../../services/redirectService';
import { tokenStorage, tokenRefreshService } from '@verichron/auth-utils';
import { Button, ButtonSize, ButtonVariant } from '../../components/Button';
import { Input } from '../../components/Input';
import { PasswordInput } from '../../components/PasswordInput';
import { Checkbox } from '../../components/Checkbox';
import { Card } from '../../components/Card';
import { Mail, Building2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import type { AuthTokenResponseDto } from '../../api/generated/models';

// Import the generated types for better type safety
import type { AuthLoginDto } from '../../api/generated/models';

interface Organization {
  organizationId: string | null;
  organizationName: string | null;
  role: string;
}

function Login() {
  const [formData, setFormData] = useState<AuthLoginDto & { rememberMe: boolean }>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * Complete authentication flow:
   * - Save tokens with "Remember Me" support
   * - Start automatic token refresh
   * - Redirect to appropriate dashboard
   */
  const completeAuthentication = (
    tokenResponse: AuthTokenResponseDto,
    selectedOrgId?: string | null
  ) => {
    // Set auth header on API client (for non-Orval direct calls if any)
    authClientInstance.setAuthToken(tokenResponse.accessToken);

    // Save tokens with "Remember Me" support
    tokenStorage.saveTokens(tokenResponse, formData.rememberMe);

    // Start automatic token refresh
    tokenRefreshService.start(tokenResponse.accessToken, {
      onRefresh: async (refreshToken) => {
        return await authService.refreshToken(refreshToken);
      },
      onRefreshFailure: (error) => {
        console.error('Session expired:', error);
        tokenStorage.clearTokens();
        toast.error('Your session has expired. Please log in again.');
        void navigate({ to: '/login' });
      },
    });

    // Success message and redirect
    toast.success('Welcome back!');
    redirectService.redirectToDashboard(
      tokenResponse.accessToken,
      selectedOrgId,
      tokenResponse.refreshToken
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Clear any existing auth state before logging in
    authClientInstance.clearAuth();

    try {
      // Step 1: Login with credentials (uses Orval-generated function via service)
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      });

      // Check if we need to show org selector (multi-org user)
      if (response.organizations.length > 1) {
        setOrganizations(response.organizations as Organization[]);
        setIsLoading(false);
        return;
      }

      // Step 2: Get scoped token (single org or platform admin)
      const orgId = response.organizations[0]?.organizationId || null;
      const tokenResponse = await authService.getToken({ organizationId: orgId as any });

      // Step 3: Complete authentication
      completeAuthentication(tokenResponse, orgId);
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrgSelection = async () => {
    if (!selectedOrgId) {
      toast.error('Please select an organization');
      return;
    }

    setIsLoading(true);
    try {
      const tokenResponse = await authService.getToken({ organizationId: selectedOrgId as any });
      completeAuthentication(tokenResponse, selectedOrgId);
    } catch (error: any) {
      console.error('Org selection error:', error);
      toast.error(error?.message || 'Failed to get access token');
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: value,
    }));
  };

  // Show org selector if user has multiple organizations
  if (organizations) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">Select Organization</h1>
          <p className="text-base text-muted-foreground">
            Choose which organization to access
          </p>
        </div>
        <Card className="p-8">
          <div className="space-y-6">
            <div className="space-y-3">
              {organizations.map((org) => (
                <button
                  key={org.organizationId}
                  type="button"
                  onClick={() => setSelectedOrgId(org.organizationId)}
                  className={`w-full p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                    selectedOrgId === org.organizationId
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        selectedOrgId === org.organizationId
                          ? 'bg-primary/10'
                          : 'bg-muted'
                      }`}
                    >
                      <Building2
                        className={`h-5 w-5 ${
                          selectedOrgId === org.organizationId
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground text-base">
                        {org.organizationName}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {org.role}
                      </div>
                    </div>
                    {selectedOrgId === org.organizationId && (
                      <ArrowRight className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <Button
              onClick={() => { void handleOrgSelection(); }}
              className="w-full"
              size={ButtonSize.LG}
              loading={isLoading}
              loadingText="Signing in..."
              disabled={!selectedOrgId}
            >
              Continue
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show login form
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
        <p className="text-base text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>
      <Card className="p-8">
        <form className="space-y-8" onSubmit={(e) => { void handleSubmit(e); }}>
          <div className="space-y-6">
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@company.com"
              icon={<Mail className="h-4 w-4" />}
              required
            />

            <PasswordInput
              label="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <Checkbox
              id="remember-me"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              label="Remember me"
            />

            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            size={ButtonSize.LG}
            loading={isLoading}
            loadingText="Signing in..."
          >
            Sign in
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-muted-foreground">
                Don't have an account?
              </span>
            </div>
          </div>

          <Link to="/register">
            <Button
              type="button"
              variant={ButtonVariant.OUTLINE}
              className="w-full"
              size={ButtonSize.LG}
            >
              Create an account
            </Button>
          </Link>
        </form>
      </Card>
    </div>
  );
}

export default Login;