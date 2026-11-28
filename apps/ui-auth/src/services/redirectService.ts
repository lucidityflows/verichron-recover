/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unused-vars */
import { jwtDecode } from 'jwt-decode';

/**
 * The namespaced location for custom claims within the JWT payload.
 * Using a URI controlled by the application is a standard practice to prevent claim collisions.
 */
const JWT_CLAIMS_NAMESPACE = 'https://verichroninc.com/claims' as const;

/**
 * Defines the structure of the custom claims object inside the JWT.
 * This is a local definition to remove dependency on @verichron/types.
 */
interface CustomJWTClaims {
  organizationId?: string | null;
  platformRoles?: string[];
  roles?: string[];
  organizationIds?: string[];
  debtorPermissions?: string[];
  isDebtor?: boolean;
}

/**
 * Defines the complete structure of the JWT payload used by this service.
 * This is a local definition to remove dependency on @verichron/types.
 */
interface JWTPayload {
  sub: string;
  userType: 'ORG_USER' | 'PLATFORM_USER' | 'DEBTOR_USER';
  iat: number;
  exp: number;
  [JWT_CLAIMS_NAMESPACE]?: CustomJWTClaims;
  // Allow for other standard JWT claims
  [key: string]: any;
}


/**
 * Dashboard URLs - configurable via environment variables
 */
const DASHBOARD_URLS = {
  ops: import.meta.env.VITE_DASHBOARD_OPS_URL ?? 'http://localhost:5174',
  managers: import.meta.env.VITE_DASHBOARD_MANAGERS_URL ?? 'http://localhost:5175',
  collectors: import.meta.env.VITE_DASHBOARD_COLLECTORS_URL ?? 'http://localhost:5176',
  consumers: import.meta.env.VITE_DASHBOARD_CONSUMERS_URL ?? 'http://localhost:5177',
  marketing: import.meta.env.VITE_DASHBOARD_MARKETING_URL ?? 'http://localhost:5178',
} as const;

/**
 * Determines which dashboard to redirect to based on JWT token
 */
export const redirectService = {
  /**
   * Get the appropriate dashboard URL based on user's role and organization
   */
  getDashboardUrl(accessToken: string, selectedOrgId?: string | null): string {
    try {
      const decoded = jwtDecode<JWTPayload>(accessToken);
      const claims = decoded[JWT_CLAIMS_NAMESPACE];

      // Debtor users (userType: DEBTOR_USER) -> ui-consumers
      if (decoded.userType === 'DEBTOR_USER') {
        return DASHBOARD_URLS.consumers;
      }

      // Platform user (no organization) -> ui-ops
      if (decoded.userType === 'PLATFORM_USER') {
        return DASHBOARD_URLS.ops;
      }

      // Get the user's role for the current organization
      const userRole = claims?.roles?.[0]; // Organization users have a single role

      // Determine dashboard based on role
      switch (userRole) {
        case 'ORG_ADMIN':
        case 'ORG_MANAGER':
          return DASHBOARD_URLS.managers;

        case 'ORG_TEAM_LEAD':
        case 'ORG_COLLECTOR':
          return DASHBOARD_URLS.collectors;

        case 'ORG_VIEWER':
          return DASHBOARD_URLS.managers;

        case 'ORG_SALES':
          return DASHBOARD_URLS.marketing;

        default:
          console.warn('Unknown user role, defaulting to managers dashboard:', userRole);
          return DASHBOARD_URLS.managers;
      }
    } catch (error) {
      console.error('Failed to decode JWT token:', error);
      return DASHBOARD_URLS.managers;
    }
  },

  /**
   * Redirect to the appropriate dashboard
   * Pass tokens via URL hash to handle cross-origin localStorage
   */
  redirectToDashboard(accessToken: string, selectedOrgId?: string | null, refreshToken?: string): void {
    const dashboardUrl = this.getDashboardUrl(accessToken, selectedOrgId);
    // Pass tokens via hash for cross-origin access (more secure than query params)
    const hashParams = `token=${encodeURIComponent(accessToken)}${refreshToken ? `&refresh=${encodeURIComponent(refreshToken)}` : ''}`;
    window.location.href = `${dashboardUrl}#${hashParams}`;
  }
};
