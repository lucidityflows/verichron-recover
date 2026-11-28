import { useAuthStore } from '../store/authStore.js';

function getOrgIdFromPersistedSession(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const raw = window.localStorage.getItem('auth-session');
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as {
      state?: { organization?: { id?: unknown } };
    };
    const orgId = parsed?.state?.organization?.id;
    return typeof orgId === 'string' && orgId.length > 0 ? orgId : undefined;
  } catch {
    return undefined;
  }
}

export function resolveOrgId(explicitOrgId?: string): string {
  if (explicitOrgId) {
    return explicitOrgId;
  }

  const storeOrgId = useAuthStore.getState().organization?.id;
  if (storeOrgId) {
    return storeOrgId;
  }

  const persistedOrgId = getOrgIdFromPersistedSession();
  if (persistedOrgId) {
    return persistedOrgId;
  }

  throw new Error('Organization context not found. Please select an organization and try again.');
}
