import { jwtDecode } from 'jwt-decode';
import { tokenStorage } from '@verichron/auth-utils';

// Define JWTPayload type locally since it's not exported from Orval
interface JWTPayload {
  sub: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

const JWT_CLAIMS_NAMESPACE = 'https://verichroninc.com/claims';

/**
 * Get the current organization ID from the JWT token
 * @returns Organization ID or null if not available
 */
export function getCurrentOrganizationId(): string | null {
  try {
    const token = tokenStorage.getAccessToken();
    if (!token) return null;

    const decoded = jwtDecode<JWTPayload>(token);
    const claims = decoded[JWT_CLAIMS_NAMESPACE];

    return claims?.organizationId || null;
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    return null;
  }
}

/**
 * Get the current organization ID or throw an error
 * @throws Error if organization ID is not available
 */
export function requireOrganizationId(): string {
  const orgId = getCurrentOrganizationId();
  if (!orgId) {
    throw new Error('Organization ID not found in token. Please log in again.');
  }
  return orgId;
}
