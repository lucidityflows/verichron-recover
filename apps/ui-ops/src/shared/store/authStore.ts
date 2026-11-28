import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles?: Array<{
    id: string;
    name: string;
  }>;
}

export interface OrganizationContext {
  id: string;
  name: string;
  status: string;
}

interface AuthState {
  // User data
  user: UserProfile | null;
  organization: OrganizationContext | null;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setOrganization: (org: OrganizationContext | null) => void;
  setSession: (user: UserProfile, organization: OrganizationContext) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setOrganization: (organization) => set({ organization }),

      setSession: (user, organization) =>
        set({ user, organization, isAuthenticated: true }),

      clearSession: () =>
        set({ user: null, organization: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-session',
      // Only persist user/org data, not sensitive tokens
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
