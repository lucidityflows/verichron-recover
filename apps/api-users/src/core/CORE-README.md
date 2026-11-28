# `core` Module

## 1. Overview

The `core` module in `api-users` is a foundational layer providing the sophisticated security and infrastructure required for the platform's central Identity and Access Management (IAM) service. It contains a specialized set of guards, decorators, and pipes tailored to handle the unique authentication and authorization models of `api-users`, including the two-step login flow and multi-type user contexts.

Unlike the `core` modules in other services, this one is highly specialized for IAM and contains more complex authorization logic to handle platform administrators, organization users, and debtor users.

## 2. Ownership & Boundaries

### What This Module Owns

-   **The Authentication & Authorization Pipeline:** It owns the complete set of NestJS Guards that authenticate incoming requests and authorize them based on user type, organization context, and fine-grained permissions.
-   **Specialized Security Decorators:** It defines a rich set of custom decorators (`@Permissions`, `@DebtorOwnership`, `@OrganizationId`) that declaratively apply security rules to controller endpoints.
-   **Custom Validation Logic:** It provides custom validation components, such as the `MatchConstraint` for DTOs.

### What This Module Does NOT Own

-   **Business Logic:** The `core` module is entirely separate from the business logic of creating users or managing roles. It only enforces the security policies surrounding those actions.
-   **Database Entities:** It does not define any database entities.
-   **Request-Scoped Context Service:** Uniquely among the microservices, the `api-users` core module does **not** provide a request-scoped `RequestContext` service. Access to user information is handled directly via the `request` object in guards or through custom parameter decorators in controllers.

---

## 3. Key Components & Patterns

### 3.1. Guards (Authentication & Authorization)

The guards in this module are highly specialized and work in a specific sequence to secure endpoints.

-   **`JwtAuthGuard`:** The primary authentication guard. It validates the main JWT access token on all protected routes using the `JwtStrategy`. Unlike the guards in other services, this version does **not** include logic for internal HMAC authentication.
-   **`AuthContextTokenGuard`:** A special-purpose guard used exclusively on the `/auth/token` endpoint. Its job is to validate the short-lived Authentication Context Token (ACT) passed via an `httpOnly` cookie. Critically, it also communicates with Redis to ensure the ACT is single-use, preventing replay attacks.
-   **`OrgContextGuard`:** A sophisticated authorization guard that runs after `JwtAuthGuard`. It is responsible for establishing the `activeContext` for a request by inspecting the `userType` claim in the JWT. It correctly handles three different contexts:
    -   **`PLATFORM_ADMIN`:** Grants a non-organizational context.
    -   **`DEBTOR`:** Grants a multi-organizational context based on an array of `organizationIds`.
    -   **`ORGANIZATION_USER`:** Enforces a single-organization context, ensuring the user is only accessing resources within their own tenant.
-   **`PermissionsGuard`:** The final authorization check. This guard validates that the user's permissions (from the JWT claims) satisfy the permissions required by the endpoint's `@Permissions` decorator. It includes special logic to map broad platform-level permissions (e.g., `platform:users:manage`) to granular resource permissions (e.g., `users:read`).

### 3.2. Custom Decorators

-   **`@DebtorOwnership()`:** A decorator unique to this service, used to flag endpoints that must be accessed only by the debtor who owns the resource. It works in conjunction with a `DebtorOwnershipGuard` (not shown) to enforce this rule.
-   **`@OrganizationId()`:** A custom parameter decorator that conveniently injects the `organizationId` from the user's JWT claims directly into a controller method's arguments.
-   **`@CurrentUserId()`:** A custom parameter decorator that injects the user's ID (`sub` claim) into a controller method's arguments.
-   **Standard Decorators:** Includes `@Public` (to bypass all guards), `@Permissions` (to define required permissions), and `@SkipOrgContext` (to bypass the `OrgContextGuard` for platform-level endpoints).

### 3.3. Custom Validation

-   **`ValidationPipe`:** A global pipe that automatically validates all incoming DTOs using `class-validator`.
-   **`MatchConstraint`:** A custom `class-validator` constraint used in DTOs to ensure that two fields (e.g., `password` and `confirmPassword`) have matching values.

---

## 4. Authentication & Authorization Flow

For a standard protected endpoint in `api-users`, a request is processed as follows:

1.  **`JwtAuthGuard`:** The incoming `Authorization: Bearer <token>` header is validated. If the JWT is valid, the decoded payload is attached to `request.user`.
2.  **`OrgContextGuard`:** The guard inspects `request.user.userType`. Based on the type, it constructs an `activeContext` object (e.g., `PlatformAdminContext`, `DebtorContext`, `OrganizationUserContext`) and attaches it to the request. For organization users, it also validates the requested `organizationId` against the one in the token.
3.  **`PermissionsGuard`:** This guard reads the permissions metadata from the endpoint decorator and compares it against the permissions present in `request.user.claims`. It throws a `MissingPermissionsException` if the user lacks the required access.
4.  **Controller Execution:** The request reaches the controller method, where custom decorators like `@CurrentUserId()` and `@OrganizationId()` can be used to inject specific user details directly into method parameters.

---

## 5. Dependencies & Integrations

### External Dependencies

-   **`@nestjs/passport` & `passport-jwt`:** Used to implement the `JwtStrategy` and `ActStrategy` for token validation.
-   **`@verichron/contracts`:** Provides shared types like `JWTPayload` and the various context interfaces.
-   **`@verichron/enums`:** Provides shared enums for `UserType`, permissions, and roles.
-   **Redis:** The `AuthContextTokenGuard` requires a Redis client to check for used ACT JTIs.

---

## 6. Gaps & Future Work

-   **`PermissionsGuard` Bug:** The unit tests for the `PermissionsGuard` reveal a known bug in how it maps platform-level "manage" permissions to resource-level actions, especially regarding pluralization (e.g., it might incorrectly check for `platform:userss:manage` instead of `platform:users:manage`). This logic needs to be reviewed and corrected.
-   **Missing `RequestContext` Service:** This core module notably lacks the request-scoped `RequestContext` service found in other microservices. This leads to a less clean pattern of dependency injection, as services needing user context must receive it via method arguments instead of injecting a dedicated context service. Introducing `RequestContext` and its associated interceptor would align this service's architecture with others in the platform.
