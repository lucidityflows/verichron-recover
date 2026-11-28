// apps/ui-auth/src/services/authService.ts
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { authClientInstance } from '../api/client/apiClient';
import { tokenStorage, tokenRefreshService } from '@verichron/auth-utils';
import type {
  AuthLoginDto,
  AuthTokenDto,
  AuthControllerRefreshTokenBody,
  AuthOrganizationListResponseDto,
  AuthTokenResponseDto,
} from '../api/generated/models';

/**
 * Import generated API functions
 * These are the raw async functions (not hooks)
 * Perfect for use in services and non-React contexts
 */
import {
  authControllerLogin,
  authControllerGetToken,
  authControllerSwitchContext,
  authControllerRefreshToken,
} from '../api/generated/endpoints/auth/auth';


/**
 * Auth Service Layer
 * 
 * Provides a clean API for authentication operations.
 * Uses Orval-generated functions under the hood.
 * 
 * Benefits:
 * - Type-safe (generated from OpenAPI)
 * - Testable (easy to mock)
 * - Consistent error handling
 * - Custom business logic injection
 */
export const authService = {
  /**
   * Step 1: Login with credentials
   * Returns list of organizations user belongs to
   */
  login: async (credentials: AuthLoginDto): Promise<AuthOrganizationListResponseDto> => {
    // The generated function has an incorrect return type. We cast to 'any' to get the actual runtime response.
    const response = await authControllerLogin(credentials) as any;
    return response as AuthOrganizationListResponseDto;
  },

  /**
   * Step 2: Exchange ACT for scoped JWT
   * User selects an organization (or gets platform token)
   */
  getToken: async (params: AuthTokenDto): Promise<AuthTokenResponseDto> => {
    const response = await authControllerGetToken(params) as any;
    return response as AuthTokenResponseDto;
  },

  /**
   * Switch organization context
   * Returns new organization list with fresh ACT
   */
  switchContext: async (): Promise<AuthOrganizationListResponseDto> => {
    const response = await authControllerSwitchContext() as any;
    return response as AuthOrganizationListResponseDto;
  },

  /**
   * Refresh access token using refresh token
   * Updates token in storage and API client
   */
  refreshToken: async (refreshToken: string): Promise<AuthTokenResponseDto> => {
    const body: AuthControllerRefreshTokenBody = { refreshToken };
    const tokens = await authControllerRefreshToken(body) as any;

    // Update the auth token in the client instance
    // This updates the interceptor for any non-Orval direct axios calls
    if (tokens?.accessToken) {
      authClientInstance.setAuthToken(tokens.accessToken);
    }
    
    return tokens as AuthTokenResponseDto;
  },

  /**
   * Logout - clear all auth state
   */
  logout: (): void => {
    // Stop automatic refresh
    tokenRefreshService.stop();

    // Clear all tokens (memory + localStorage)
    tokenStorage.clearTokens();

    // Clear auth header from API client
    authClientInstance.clearAuth();

    // Optional: Call backend logout endpoint to invalidate refresh token
    // await authControllerLogout();

    console.log('User logged out successfully');
  },

  // ============================================================================
  // TODO: Future auth methods (uncomment when backend is ready)
  // ============================================================================

  /*
  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const response = await authControllerRegister({ data: userData });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await authControllerForgotPassword({ data: { email } });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await authControllerResetPassword({
      data: { token, newPassword }
    });
    return response.data;
  },

  verifyEmail: async (token: string) => {
    const response = await authControllerVerifyEmail({ data: { token } });
    return response.data;
  },
  */
};