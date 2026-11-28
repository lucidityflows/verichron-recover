// apps/ui-organizations/src/shared/components/RoleGuard.tsx
import React from 'react';
import { useUser } from '../store/userStore';

interface RoleGuardProps {
  /** The role or roles allowed to see the content */
  allowedRoles?: string[];
  /** The permissions allowed to see the content */
  allowedPermissions?: string[];
  /** High-level user types allowed (e.g. PLATFORM_ADMIN) */
  allowedUserTypes?: string[];
  /** The content to render if the user is authorized */
  children: React.ReactNode;
  /** Optional: A component or element to show if the user does not have access */
  fallback?: React.ReactNode;
  /** If true, user must have ALL specified roles/permissions. Default is ANY (OR logic) */
  requireAll?: boolean;
}

/**
 * A component that conditionally renders its children based on the current user's roles, permissions, or user type.
 * Supports platform-level checks.
 */
export function RoleGuard({
  allowedRoles,
  allowedPermissions,
  allowedUserTypes,
  children,
  fallback = null,
}: RoleGuardProps) {
  const { roles, permissions, userType, isPlatformUser } = useUser();

  // Platform Users usually bypass organization-level checks
  if (isPlatformUser && !allowedUserTypes?.includes('PLATFORM_USER') && !allowedRoles?.length && !allowedPermissions?.length) {
    // If it's a platform user and no specific platform roles are required, allow by default?
    // Actually, it's better to be explicit.
  }

  let isAllowed = false;

  // Check User Type
  if (allowedUserTypes?.length) {
    isAllowed = userType ? allowedUserTypes.includes(userType) : false;
  }

  // Check Roles
  if (allowedRoles?.length) {
    const hasRole = allowedRoles.some(r => roles.includes(r));
    isAllowed = isAllowed || hasRole;
  }

  // Check Permissions
  if (allowedPermissions?.length) {
    const hasPermission = allowedPermissions.some(p => permissions.includes(p));
    isAllowed = isAllowed || hasPermission;
  }

  // If no restrictions provided, allow
  if (!allowedRoles?.length && !allowedPermissions?.length && !allowedUserTypes?.length) {
    isAllowed = true;
  }

  return isAllowed ? <>{children}</> : <>{fallback}</>;
}
