/**
 * @file RequestContext
 * @description Provides a request-scoped mechanism to access the current user's and
 *   organization's context throughout the lifecycle of a single HTTP request.
 */
import { Injectable, Scope } from '@nestjs/common';

/**
 * User context extracted from JWT token or service authentication
 */
export interface UserContext {
  userId: string;
  username: string;
  email: string;
  orgId?: string;
  roles?: string[];
  permissions?: string[];
  platformRoles?: string[];
}

/**
 * RequestContext service provides access to the current request's user information
 *
 * This service is REQUEST-scoped, meaning a new instance is created for each request.
 */
@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
  private user?: UserContext;

  setUser(user: UserContext): void {
    this.user = user;
  }

  getUser(): UserContext | undefined {
    return this.user;
  }

  getUserId(): string | undefined {
    return this.user?.userId;
  }

  getUserEmail(): string | undefined {
    return this.user?.email;
  }

  getUsername(): string | undefined {
    return this.user?.username;
  }

  getOrgId(): string | undefined {
    return this.user?.orgId;
  }

  getRoles(): string[] {
    return this.user?.roles || [];
  }

  getPermissions(): string[] {
    return this.user?.permissions || [];
  }

  getPlatformRoles(): string[] {
    return this.user?.platformRoles || [];
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  hasPermission(permission: string): boolean {
    return this.getPermissions().includes(permission);
  }

  hasPlatformRole(role: string): boolean {
    return this.getPlatformRoles().includes(role);
  }

  isAuthenticated(): boolean {
    return this.user !== undefined;
  }
}
