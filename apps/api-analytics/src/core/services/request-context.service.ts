/**
 * @file RequestContext
 * @description Provides a request-scoped mechanism to access the current user's and
 *   organization's context throughout the lifecycle of a single HTTP request.
 *
 * @overview
 *   - **Request Scoped**: A new instance of this service is created for each incoming request,
 *     ensuring that context data is isolated and specific to that request.
 *   - **Centralized Context**: Acts as a central repository for authenticated user information
 *     (e.g., `userId`, `email`, `username`) and authorization context (e.g., `orgId`,
 *     `roles`, `permissions`, `platformRoles`).
 *   - **Clean Code**: Eliminates the need to pass `request` objects or user details
 *     through multiple layers of function calls, leading to cleaner and more maintainable code.
 *   - **Read-Only Access**: Provides getter methods to safely retrieve context information.
 *
 * @usage
 *   1. **Population**: The `RequestContextInterceptor` is responsible for populating this service
 *      early in the request pipeline, after authentication and authorization guards have run.
 *   2. **Injection**: Inject `RequestContext` into any service, controller, or provider
 *      where user or organization context is needed.
 *   3. **Access**: Use the provided getter methods (e.g., `getUserId()`, `getOrgId()`, `hasRole()`)
 *      to access the relevant context information.
 *
 * @example
 * // In a service:
 * // @Injectable()
 * // export class MyService {
 * //   constructor(private readonly requestContext: RequestContext) {}
 * //
 * //   doSomethingProtected() {
 * //     const userId = this.requestContext.getUserId();
 * //     const orgId = this.requestContext.getOrgId();
 * //     if (this.requestContext.hasPermission('debtor:write')) {
 * //       // ... perform write operation
 * //     }
 * //   }
 * // }
 */
import { Injectable, Scope } from '@nestjs/common';

/**
 * User context extracted from JWT token
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
 * It provides a clean way to access user context throughout the request lifecycle
 * without passing request objects around.
 *
 * Usage:
 * 1. Inject RequestContext into your service
 * 2. Call setUser() in a controller/interceptor to populate context
 * 3. Access user info via getUser() / getUserId() / getOrgId() etc.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ProfilesService {
 *   constructor(private readonly requestContext: RequestContext) {}
 *
 *   async updateDebtor(debtorId: string, dto: UpdateDto) {
 *     const updatedBy = this.requestContext.getUserId();
 *     const orgId = this.requestContext.getOrgId();
 *     // ... use updatedBy and orgId in business logic
 *   }
 * }
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
  private user?: UserContext;

  /**
   * Set the user context for this request
   * Should be called early in the request lifecycle (e.g., in a controller or interceptor)
   */
  setUser(user: UserContext): void {
    this.user = user;
  }

  /**
   * Get the full user context
   */
  getUser(): UserContext | undefined {
    return this.user;
  }

  /**
   * Get the current user's ID
   */
  getUserId(): string | undefined {
    return this.user?.userId;
  }

  /**
   * Get the current user's email
   */
  getUserEmail(): string | undefined {
    return this.user?.email;
  }

  /**
   * Get the current user's username
   */
  getUsername(): string | undefined {
    return this.user?.username;
  }

  /**
   * Get the current organization ID (from active context)
   */
  getOrgId(): string | undefined {
    return this.user?.orgId;
  }

  /**
   * Get the current user's roles in the active organization
   */
  getRoles(): string[] {
    return this.user?.roles || [];
  }

  /**
   * Get the current user's permissions in the active organization
   */
  getPermissions(): string[] {
    return this.user?.permissions || [];
  }

  /**
   * Get the current user's platform-level roles
   */
  getPlatformRoles(): string[] {
    return this.user?.platformRoles || [];
  }

  /**
   * Check if user has a specific role in the active organization
   */
  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  /**
   * Check if user has a specific permission in the active organization
   */
  hasPermission(permission: string): boolean {
    return this.getPermissions().includes(permission);
  }

  /**
   * Check if user has a specific platform role
   */
  hasPlatformRole(role: string): boolean {
    return this.getPlatformRoles().includes(role);
  }

  /**
   * Check if user context has been set
   */
  isAuthenticated(): boolean {
    return this.user !== undefined;
  }
}
