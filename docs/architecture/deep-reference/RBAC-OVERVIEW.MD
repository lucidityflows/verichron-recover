  Comprehensive Analysis of Verichron Authentication & Authorization System

  1. Overall Philosophy & Goals

  Our system is built on a microservice architecture with a strong emphasis on decoupling, multi-tenancy, and role-based access control (RBAC). The primary goals of our
  authentication and authorization (AuthN/AuthZ) system are:

   * Centralized Identity Management: api-users is the single source of truth for user identities, authentication, and core RBAC definitions.
   * Stateless Authorization: Utilizing JSON Web Tokens (JWTs) for stateless authorization, minimizing server-side session state.
   * Multi-Tenancy: Securely isolating data and access for different organizations (tenants). A user can belong to multiple organizations with different roles in each.
   * Platform-Level Administration: Supporting "Platform Admins" who can operate across all organizations without being tied to a specific organizationId.
   * Granular Permissions: Defining fine-grained permissions (resource:action) that can be assigned to roles.
   * Event-Driven Communication: All inter-service communication related to user and organization state changes is asynchronous via events.
   * Consistent Enforcement: Applying a standardized set of guards and decorators across microservices to enforce security policies.

  ---

  2. Core Components

  2.1. JWT Structure (@verichron/types)

  The JWT is the cornerstone of our stateless authorization. It carries essential user and authorization information.

   * `JWTPayload` Interface: The top-level structure of our JWT payload.
       * sub: string: The user's unique ID (subject).
       * userType: UserType: Categorizes the user (e.g., ORGANIZATION_USER, PLATFORM_ADMIN, DEBTOR). Crucial for differentiating authorization flows.
       * iat, exp: Standard JWT "issued at" and "expiration" timestamps.
       * [JWT_CLAIMS_NAMESPACE]: CustomJWTClaims: A namespaced object containing all our custom application-specific claims. This prevents collisions with standard JWT
         claims.
           * `JWT_CLAIMS_NAMESPACE`: https://verichroninc.com/claims (or similar URI).

   * `CustomJWTClaims` Interface: Defines the structure of our custom claims.
       * organizationId?: string | null: Crucial for multi-tenancy and platform admins.
           * For ORGANIZATION_USERs, this will be the UUID of the organization the token is currently scoped to.
           * For PLATFORM_ADMINs, this will be null, indicating a platform-level context.
       * permissions?: string[]: An array of granular permission codes (e.g., orgs:read, users:create). These are the effective permissions for the current organizationId
         (or platform-wide for platform admins).
       * platformRoles?: PlatformRole[]: An array of platform-level roles (e.g., PLATFORM_ADMIN). Present only for PLATFORM_ADMIN userType.

  2.2. Roles & Permissions (api-users RBAC Module)

  api-users is the source of truth for all role and permission definitions.

   * Platform Roles (`PLATFORM_ROLES`):
       * Defined in @verichron/types/src/platform/constants.ts.
       * Examples: PLATFORM_ADMIN, PLATFORM_VIEWER, PLATFORM_SUPPORT.
       * These roles are organization-agnostic and grant system-wide capabilities.
       * Managed directly in the api-users database with organizationId: null.
   * Organization Roles (`OrganizationRole`):
       * Defined in @verichron/types/src/enums/organizations/organization-roles.enum.ts.
       * Examples: ORG_ADMIN, ORG_MANAGER, ORG_AGENT, ORG_VIEWER.
       * These roles are organization-scoped and grant capabilities within a specific tenant.
       * Managed in the api-users database with a specific organizationId.
   * Permissions (`PLATFORM_PERMISSIONS`, `OrganizationPermission`):
       * Granular capabilities expressed as resource:action strings (e.g., platform:orgs:create, orgs:settings:write).
       * Defined in @verichron/types/src/platform/constants.ts (for platform) and api-organizations (for organization-specific permissions).
       * Permissions are assigned to roles, and users inherit permissions through their assigned roles.

  2.3. Authentication Flow (api-users Auth Module)

  The api-users Auth Module orchestrates the user login and token issuance process.

   * Two-Step Login:
       1. `POST /auth/login`: User provides credentials. api-users validates them and returns an Authentication Context Token (ACT) (as an HttpOnly cookie) and a list of
          organizations the user is associated with.
       2. `POST /auth/token`: The client selects an organization (or indicates platform login) and sends the organizationId (or null for platform admin) along with the ACT.
          api-users then issues a scoped JWT (access token and refresh token).
   * Platform Admin Login:
       * A platform admin's user_memberships record has organizationId: null.
       * When they log in, getOrganizationAssociations returns a membership with organizationId: null.
       * The client then calls POST /auth/token with organizationId: null.
       * The AuthTokenDto now allows organizationId?: string | null.
       * AuthService.getScopedToken accepts organizationId: string | null. If null, it generates a platform-scoped JWT.
   * ACT (Authentication Context Token): A short-lived, single-use token used to bridge the two steps of the login process securely. It's burned (marked as used) in Redis
     after the JWT is issued.
   * Refresh Tokens: Used to obtain new access tokens without re-authenticating, supporting longer user sessions.
   * Context Switching (`POST /auth/switch-context`): Allows an authenticated user to obtain a new ACT to select a different organization context, resulting in a new
     organization-scoped JWT.

  ---

  3. Authorization Enforcement (Guards & Decorators)

  Authorization is enforced through a chain of NestJS Guards, often configured globally or applied per-route using decorators.

  3.1. JwtAuthGuard (Global)

   * Purpose: The first line of defense. Ensures that incoming requests have a valid, unexpired JWT.
   * Mechanism: Extends AuthGuard('jwt') from @nestjs/passport, delegating token validation to the JwtStrategy.
   * `@Public()` Decorator: Routes marked with @Public() bypass this guard entirely, allowing unauthenticated access (e.g., login, health checks).
   * `handleRequest`: Extracts the validated JWTPayload from the Passport flow and attaches it to request.user. Throws UnauthorizedException on failure.

  3.2. JwtStrategy (Passport Strategy)

   * Purpose: Decodes the JWT and validates its internal structure and claims.
   * Mechanism: Implements Passport's Strategy for JWTs.
   * Key Logic:
       * Verifies sub, userType, and the presence of [JWT_CLAIMS_NAMESPACE].
       * Platform Admin Validation: If userType is PLATFORM_ADMIN, it requires claims.organizationId to be null and claims.platformRoles to be present.
       * Organization User Validation: If userType is not PLATFORM_ADMIN, it requires claims.organizationId to be a non-null string.
       * Returns the validated JWTPayload.

  3.3. OrgContextGuard (Global)

   * Purpose: Enforces multi-tenancy by ensuring users only access resources within their authorized organization context.
   * Mechanism:
       * Extracts the JWTPayload from request.user.
       * Platform Admin Handling: If userType is PLATFORM_ADMIN, this guard allows access (their cross-organizational access is then controlled by PermissionsGuard).
       * Organization User Handling:
           * Extracts the user's organizationId from their JWT claims.
           * Extracts the requestedOrgId from the x-org-id HTTP header.
           * If x-org-id is present, it must match the organizationId in the user's token. Otherwise, a ForbiddenException is thrown.
           * If x-org-id is not present, the guard assumes the user is operating within their token's organizationId and attaches request.organizationId = userOrgId for
             downstream use.
       * Attaches the validated organizationId to request.organizationId for easy access in controllers and services.

  3.4. PermissionsGuard (Per-Route)

   * Purpose: Enforces granular permission checks for specific API endpoints.
   * Mechanism: Uses the @Permissions() decorator to retrieve a list of required permission codes for a route.
   * Logic:
       * Retrieves requiredPermissions from the route's metadata.
       * Extracts userPermissions from request.user[JWT_CLAIMS_NAMESPACE].permissions.
       * Checks if the user possesses all of the requiredPermissions.
       * Throws UnauthorizedException (if unauthenticated) or ForbiddenException (if authenticated but lacking permissions).
       * Platform Admin Consideration: For platform admins, userPermissions will contain platform:* permissions. The guard checks these against the @Permissions()
         decorator.

  3.5. RoleGuard (Per-Route)

   * Purpose: Enforces role-based access for specific API endpoints.
   * Mechanism: Uses the @Roles() decorator to retrieve a list of required roles for a route.
   * Logic:
       * Retrieves requiredRoles from the route's metadata.
       * Extracts userRoles from request.user[JWT_CLAIMS_NAMESPACE].orgRoles (for organization users) or request.user[JWT_CLAIMS_NAMESPACE].platformRoles (for platform
         admins).
       * Checks if the user possesses at least one of the requiredRoles.
       * Throws ForbiddenException if the user does not have any of the required roles.

  3.6. Decorators

   * `@Public()`: Marks a route as publicly accessible, bypassing JwtAuthGuard.
   * `@Permissions(...permissions: string[])`: Specifies the granular permissions required to access a route. Used by PermissionsGuard.
   * `@Roles(...roles: string[])`: Specifies the roles required to access a route. Used by RoleGuard.
   * `@OrganizationId()`: A parameter decorator that extracts the organizationId from request.user[JWT_CLAIMS_NAMESPACE].organizationId and injects it into the controller
     method. Throws an error if organizationId is missing (unless it's a platform admin, in which case it would be null).
   * `@CurrentUserId()`: Extracts the userId (sub) from request.user and injects it into the controller method.
   * `@SkipOrgContext()`: (Not currently used in api-organizations but exists in api-users) Bypasses OrgContextGuard for specific routes.

  ---

  4. Inter-Service Communication (Event-Driven)

   * "Thin Events" Philosophy: Events published by services (e.g., UserCreated, OrganizationCreated) contain only essential identifiers, not full data payloads. Consumers
     must call back to the source service (e.g., api-users or api-organizations) to fetch the latest state, ensuring eventual consistency and preventing stale data.
   * Event Publisher (`@verichron/event-publisher`): Used by services to publish events to GCP Pub/Sub.
   * Event Subscriber (`@verichron/event-subscriber`): Used by services to listen for and react to events from other services.

  ---

  5. Key Design Principles & Trade-offs

   * Centralized IAM: api-users owns all user and RBAC data, preventing duplication and ensuring consistency.
   * Decoupling: Event-driven communication minimizes direct HTTP dependencies between services, improving resilience and scalability.
   * Two-Layered Authorization:
       1. JWT (Global): Provides general capability checks (roles, permissions) at the API Gateway/Guard level.
       2. Service-Specific (Local): Owning services perform resource-level checks (e.g., "Can this user access this specific debt?").
   * Multi-Tenancy: Enforced at the guard level (OrgContextGuard) and within service queries (filtering by organizationId).
   * Platform-Level vs. Organization-Level Roles: A clear distinction is maintained in JWTs and guards, allowing for flexible system administration without compromising
     tenant isolation.
   * Trade-off (Eventual Consistency): While robust, event-driven systems introduce eventual consistency, meaning data might not be immediately synchronized across all
     services. This is acceptable for our domain.

  ---

  6. Future Considerations/TODOs

   * User Validation in `JwtStrategy`: The JwtStrategy currently validates the token's structure but doesn't check if the user still exists in the database. This is a
     planned enhancement.
   * Refresh Token Rotation: Implementing more advanced refresh token rotation strategies for enhanced security.
   * Audit Logging: Comprehensive audit logging for all authentication and authorization events.

