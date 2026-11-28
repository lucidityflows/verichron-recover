# `core` Module

## 1. Overview

The `core` module provides the foundational, cross-cutting concerns for the entire `api-debtors` microservice. It is a global module, meaning its exported providers (like `RequestContext`) are available for dependency injection throughout the application without needing to import `CoreModule` in every feature module.

This module is not a business feature but rather the architectural backbone that handles:
-   **Authentication & Authorization:** A pipeline of guards that secure endpoints.
-   **Request Context Management:** A request-scoped service for safely accessing user and organization context.
-   **Global Error Handling:** A standardized filter for all exceptions.
-   **Data Validation:** A global pipe for validating all incoming DTOs.

---

## 2. Key Components & Patterns

The `core` module is composed of several types of components that work together to process incoming requests.

### 2.1. Services

#### `RequestContext`
This is a **request-scoped** service that acts as a centralized, safe container for the authenticated user's information during a single HTTP request.

-   **Purpose:** To eliminate the need to pass the `request` object or user details through multiple layers of the application. Services can simply inject `RequestContext` to get the `userId`, `orgId`, roles, or permissions of the current user.
-   **Lifecycle:** A new instance is created for each request. It is populated by the `RequestContextInterceptor` after the authentication and authorization guards have successfully run.

### 2.2. Guards (Authentication & Authorization)

Guards are executed in a specific order to protect endpoints.

1.  **`JwtAuthGuard`**: This is the primary authentication guard. It has a dual responsibility:
    -   **External Users:** For requests with an `Authorization: Bearer <token>` header, it validates the JWT token using the `JwtStrategy`.
    -   **Internal Services:** For service-to-service calls, it checks for a set of HMAC-based authentication headers (e.g., `x-verichron-service-name`, `x-verichron-signature`). If present and valid, it bypasses the JWT check, allowing trusted internal services to communicate securely.

2.  **`OrgContextGuard`**: This guard runs after `JwtAuthGuard` and is responsible for multi-tenancy and establishing the organization context.
    -   It identifies the user type (`PLATFORM_ADMIN`, `ORGANIZATION_USER`, `DEBTOR`).
    -   For `ORGANIZATION_USER`, it ensures the user is only accessing data within their own organization by comparing the `organizationId` in their JWT with the organization being requested (from the `x-org-id` header or route/body parameters).
    -   It attaches an `activeContext` object to the `request`, containing the validated `orgId`, roles, and permissions for the current request's scope.

3.  **`PermissionsGuard` & `RoleGuard`**: These are the final authorization guards.
    -   They read the `@Permissions()` and `@Roles()` metadata from the endpoint.
    -   They check the `activeContext` object (set by `OrgContextGuard`) to see if the user possesses the required roles or permissions.
    -   `PermissionsGuard` requires the user to have **all** specified permissions.
    -   `RoleGuard` requires the user to have **at least one** of the specified roles.

### 2.3. Decorators

Decorators are used to attach metadata to controllers and route handlers, which is then used by the guards.

-   `@Public()`: Marks an endpoint as public, causing `JwtAuthGuard` to skip authentication entirely.
-   `@Permissions(...permissions: string[])`: Specifies one or more permission strings that a user must have to access the endpoint.
-   `@Roles(...roles: string[])`: Specifies one or more role strings, of which a user must have at least one.
-   `@SkipOrgContext()`: Allows an endpoint to bypass the `OrgContextGuard`, useful for system-level routes that are not organization-specific.
-   `@OrganizationId()`: A custom parameter decorator that conveniently injects the validated `organizationId` from the `RequestContext` directly into a controller method's argument.

### 2.4. Interceptors

#### `RequestContextInterceptor`
This interceptor runs after the guards and is responsible for populating the `RequestContext` service. It takes the `user` and `activeContext` objects from the `request` object and injects them into the request-scoped `RequestContext` instance, making them easily available to the rest of the application.

### 2.5. Filters

#### `AllExceptionsFilter`
This is a global exception filter that catches any unhandled error in the application. It ensures that all error responses sent to the client are standardized into a consistent JSON format (`{ statusCode, message, errorCode, ... }`). It also provides enhanced, detailed logging of the error, stack trace, and request context to aid in debugging.

### 2.6. Pipes

#### `ValidationPipe`
This is a global pipe that automatically validates all incoming DTOs against the rules defined using `class-validator` decorators. It also strips any properties not defined in the DTO, protecting against mass assignment vulnerabilities.

---

## 3. Request Lifecycle & Security Flow

The components of the `core` module work together in a well-defined pipeline for every protected request:

1.  **Incoming Request**
2.  **`JwtAuthGuard`**: Authenticates the request.
    -   Is it an internal service call with valid HMAC headers? If yes, allow and set a `serviceAccount` context.
    -   Is it an external call with a valid JWT? If yes, allow and attach the JWT payload (`user`) to the request.
    -   If neither, reject with a `401 Unauthorized`.
3.  **`OrgContextGuard`**: Authorizes organization access.
    -   Examines the `user` object.
    -   Verifies the user is allowed to access the requested organization's data.
    -   Attaches the `activeContext` object to the request, containing the user's roles and permissions for this specific request context.
    -   If access is denied, reject with a `403 Forbidden`.
4.  **`RoleGuard` / `PermissionsGuard`**: Authorizes specific actions.
    -   Read the `@Roles` and `@Permissions` decorators on the target endpoint.
    -   Check if the `activeContext.roles` or `activeContext.permissions` array satisfies the requirements.
    -   If not, reject with a `403 Forbidden`.
5.  **`RequestContextInterceptor`**: Populates the `RequestContext` service with data from `request.user` and `request.activeContext`.
6.  **`ValidationPipe`**: Validates the DTOs in the request `body`, `query`, and `params`.
7.  **Controller & Service Logic**: The application's business logic runs. Services can now safely inject and use `RequestContext` to get user/org context.
8.  **Response / Exception**
    -   If an exception is thrown anywhere, `AllExceptionsFilter` catches it and sends a standardized JSON error response.
    -   If successful, the response is sent to the client.
