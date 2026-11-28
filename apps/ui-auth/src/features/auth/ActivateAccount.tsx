import React, { useState } from 'react';
import { useParams, useNavigate, Link } from '@tanstack/react-router';
import { ShieldCheck, Lock, Building2, ArrowRight } from 'lucide-react';
import { Button, ButtonSize } from '../../components/Button.js';
import { PasswordInput } from '../../components/PasswordInput.js';
import { Card } from '../../components/Card.js';
import { toast } from 'sonner';
import { useProfilesPublicControllerActivateUser } from '../../api/generated/endpoints/users-public/users-public.js';
import { getErrorMessage } from '../../utils/errors.js';
import { authService } from '../../services/authService.js';
import { authClientInstance } from '../../api/client/apiClient.js';
import { redirectService } from '../../services/redirectService.js';
import { tokenStorage, tokenRefreshService } from '@verichron/auth-utils';
import type { AuthTokenResponseDto, UserDetailDto } from '../../api/generated/models/index.js';

interface Organization {
  organizationId: string;
  organizationName: string;
  role: string;
}

export function ActivateAccount() {
  const { token } = useParams({ from: '/activate/$token' });
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const activateMutation = useProfilesPublicControllerActivateUser();

  /**
   * Complete authentication flow after activation:
   * - Save tokens
   * - Start automatic token refresh
   * - Redirect to appropriate dashboard
   */
  const completeAuthentication = (
    tokenResponse: AuthTokenResponseDto,
    selectedOrgId?: string | null
  ) => {
    authClientInstance.setAuthToken(tokenResponse.accessToken);
    tokenStorage.saveTokens(tokenResponse, false);

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

    toast.success('Welcome to Verichron!');
    redirectService.redirectToDashboard(
      tokenResponse.accessToken,
      selectedOrgId,
      tokenResponse.refreshToken
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const userData = (await activateMutation.mutateAsync({
        data: {
          invitationToken: token,
          password,
          passwordConfirmation: confirmPassword,
        },
      })) as unknown as UserDetailDto;

      toast.success('Account activated successfully!');

      // Map memberships to organizations format
      const orgs: Organization[] = (userData.memberships || []).map((m: any) => ({
        organizationId: m.organizationId,
        organizationName: m.organizationName,
        role: m.role?.name || 'Member',
      }));

      if (orgs.length === 0) {
        // No org memberships - just redirect to login
        toast.info('Please log in to continue.');
        navigate({ to: '/login' });
        return;
      }

      if (orgs.length > 1) {
        // Multi-org user - store email and show org selector
        setUserEmail(userData.email);
        setOrganizations(orgs);
        setIsLoading(false);
        return;
      }

      // Single org - auto-login
      const orgId = orgs[0].organizationId;

      // Login with the credentials they just set
      await authService.login({
        email: userData.email,
        password: password,
      });

      // Get scoped token for the org
      const tokenResponse = await authService.getToken({ organizationId: orgId as any });
      completeAuthentication(tokenResponse, orgId);

    } catch (error) {
      const message = getErrorMessage(error, 'Failed to activate account');
      toast.error(message);
      setIsLoading(false);
    }
  };

  const handleOrgSelection = async () => {
    if (!selectedOrgId || !organizations || !userEmail) {
      toast.error('Please select an organization');
      return;
    }

    setIsLoading(true);
    try {
      // Login first to establish the ACT cookie
      await authService.login({
        email: userEmail,
        password: password,
      });

      // Then get scoped token for the selected org
      const tokenResponse = await authService.getToken({ organizationId: selectedOrgId as any });
      completeAuthentication(tokenResponse, selectedOrgId);
    } catch (error: any) {
      console.error('Org selection error:', error);
      toast.error(error?.message || 'Failed to get access token');
      setIsLoading(false);
    }
  };

  // Show org selector if user has multiple organizations
  if (organizations) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-3 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Select Organization
          </h1>
          <p className="text-base text-muted-foreground max-w-sm mx-auto">
            Your account is activated! Choose which organization to access.
          </p>
        </div>

        <Card className="p-8 shadow-xl border-primary/10">
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
              className="w-full group"
              size={ButtonSize.LG}
              loading={isLoading}
              loadingText="Signing in..."
              disabled={!selectedOrgId}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-3 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-2">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Activate Your Account
        </h1>
        <p className="text-base text-muted-foreground max-w-sm mx-auto">
          Complete your profile by setting a secure password for your Verichron account.
        </p>
      </div>

      <Card className="p-8 shadow-xl border-primary/10">
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
          <div className="space-y-4">
            <PasswordInput
              label="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              showStrengthIndicator={true}
              required
              autoFocus
            />

            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              error={
                confirmPassword && password !== confirmPassword
                  ? 'Passwords do not match'
                  : undefined
              }
              required
            />
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border flex gap-3">
            <Lock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">Security Requirement</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Passwords must be at least 8 characters long and include a mix of letters, numbers, and symbols.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full group"
            size={ButtonSize.LG}
            loading={isLoading || activateMutation.isPending}
          >
            Activate Account
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Already activated?{' '}
        <Link to="/login" className="text-primary font-semibold hover:underline">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
