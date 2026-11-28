// apps/ui-organizations/src/shared/store/userStore.ts
import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';

// Consistent with the claims structure in ui-auth's redirectService
const JWT_CLAIMS_NAMESPACE = 'https://verichroninc.com/claims';

interface CustomJWTClaims {
  organizationId?: string | null;
  roles?: string[];
  permissions?: string[];
  platformRoles?: string[];
  platformPermissions?: string[];
  [key: string]: any;
}

interface DecodedToken {
  sub: string; // User ID
  userType: string;
  email: string;
  name: string; // User's full name
  [JWT_CLAIMS_NAMESPACE]?: CustomJWTClaims;
  iat?: number;
  exp?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  user: User | null;
  userType: string | null;
  organizationId: string | null;
  roles: string[];
  permissions: string[];
  setUserFromToken: (accessToken: string) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  userType: null,
  organizationId: null,
  roles: [],
  permissions: [],
  setUserFromToken: (accessToken) => {
    try {
      const decoded = jwtDecode<DecodedToken>(accessToken);
      const claims = decoded[JWT_CLAIMS_NAMESPACE];
      
      // Determine roles based on user type (platform vs org)
      const roles = decoded.userType === 'PLATFORM_USER' 
        ? (claims?.platformRoles ?? []) 
        : (claims?.roles ?? []);
        
      const permissions = decoded.userType === 'PLATFORM_USER'
        ? (claims?.platformPermissions ?? [])
        : (claims?.permissions ?? []);

      set({
        user: {
          id: decoded.sub,
          name: decoded.name || decoded.email,
          email: decoded.email,
        },
        userType: decoded.userType,
        organizationId: claims?.organizationId ?? null,
        roles: roles,
        permissions: permissions,
      });
    } catch (error) {
      console.error('Failed to decode token and set user state:', error);
      set({ user: null, userType: null, organizationId: null, roles: [], permissions: [] });
    }
  },
  clearUser: () => {
    set({ user: null, userType: null, organizationId: null, roles: [], permissions: [] });
  },
}));

/**
 * Convenience hook for direct access to user properties and role checks.
 */
export const useUser = () => {
  const { user, userType, organizationId, roles, permissions } = useUserStore();
  
  const hasRole = (role: string | string[]) => {
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.some(r => roles.includes(r));
  };

  const hasPermission = (permission: string | string[]) => {
    const permsToCheck = Array.isArray(permission) ? permission : [permission];
    return permsToCheck.some(p => permissions.includes(p));
  };

  const isPlatformUser = userType === 'PLATFORM_USER';

  return {
    user,
    userId: user?.id,
    userType,
    organizationId,
    roles,
    permissions,
    hasRole,
    hasPermission,
    isPlatformUser,
    isAuthenticated: !!user,
  };
};
