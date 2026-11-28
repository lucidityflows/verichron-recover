# Unit & Integration Testing Philosophy: api-users

This document serves as the source of truth for the `api-users` testing strategy, complementing the project-wide E2E testing philosophy. It defines the types of tests we write, our conventions, and the core system rules our tests are designed to validate for this specific microservice.

## 1. Core Principles

- **Documentation First**: Every test file must begin with a header comment explaining the **System Rule(s)** it proves and what it does and does not test. Tests are living documentation.
- **Deliberate & Meaningful**: Tests must be written with a clear purpose, validating specific business logic, edge cases, or integration points. We favor quality and clarity over raw line coverage.
- **Isolation & Speed**: Tests should be as isolated as possible. Unit tests must be fast.

## 2. Two-Tier Testing Strategy

We employ a two-tier strategy for testing within the `api-users` microservice.

### Tier 1: Unit Tests (`*.service.spec.ts`, `*.guard.spec.ts`)

- **Purpose**: To test a single class (a "unit") in complete isolation.
- **Method**: All external dependencies (e.g., database repositories, other services, event bus) are mocked using Jest's mocking capabilities.
- **Goal**: To verify the correctness of individual pieces of business logic quickly and efficiently. These tests must be fast.

### Tier 2: Integration Tests (`*.controller.spec.ts`)

- **Purpose**: To test the collaboration of classes that make up a feature's request pipeline, from the controller down to the service.
- **Method**: Use `@nestjs/testing` to create an in-memory test server for a specific NestJS module (e.g., `AuthModule`, `ProfilesModule`). External infrastructure (like the database) is still mocked, but internal dependencies are resolved by the NestJS dependency injection container.
- **Goal**: To verify that a feature's components (Controller, Service, DTOs, Pipes, Guards) are correctly "wired" together and handle HTTP requests as expected. This layer is critical for catching dependency injection and configuration errors.

---

## 3. Documented System Rules for `api-users`

This section lists the core system rules for `api-users` that our tests prove.

### AUTH: Authentication Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-U-AUTH-001** | `validateUser` must successfully return a user for valid credentials and throw `UnauthorizedException` for invalid credentials. | `auth.service.spec.ts` | ✅ Implemented |
| **R-U-AUTH-002** | `login` must return a valid ACT (Authentication Context Token) and a list of the user's organizations. | `auth.service.spec.ts` | ✅ Implemented |
| **R-U-AUTH-003** | `getScopedToken` must "burn" the ACT's JTI in Redis to prevent replay attacks. | `auth.service.spec.ts` | ✅ Implemented |
| **R-U-AUTH-004** | `getScopedToken` must throw `UnauthorizedException` if a user requests a token for an organization they are not a member of. | `auth.service.spec.ts` | ✅ Implemented |
| **R-U-AUTH-005** | `getScopedToken` must correctly construct JWTs with platform-specific claims for platform admins (`organizationId: null`). | `auth.service.spec.ts` | ✅ Implemented |
| **R-U-AUTH-006** | `refreshToken` must successfully issue a new access token for a valid refresh token and throw `UnauthorizedException` for an invalid one. | `auth.service.spec.ts` | ✅ Implemented |

### RBAC: Role-Based Access Control Rules

| Rule ID | Description | Test File(s) |
|---|---|---|
| **R-U-RBAC-001** | `createRole` must correctly create a new role and assign permissions within a transaction. | `rbac.service.spec.ts` | ✅ Implemented |
| **R-U-RBAC-002** | A role cannot be deleted if users are still assigned to it. | `rbac.service.spec.ts` | ✅ Implemented |
| **R-U-RBAC-003** | System roles (e.g., "Organization Admin") cannot be deleted. | `rbac.service.spec.ts` | ✅ Implemented |

### PROFILES: User Profile Management Rules

| Rule ID | Description | Test File(s) |
|---|---|---|
| **R-U-PROF-001** | `inviteUser` must fail if a user with the same email already exists. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-U-PROF-002** | `activateUser` must fail if the invitation token is expired or invalid. | `profiles.service.spec.ts` | ✅ Implemented |
| **R-U-PROF-003** | `updateUser` must publish a `UserProfileUpdated` and/or `UserStatusChanged` event when relevant fields are changed. | `profiles.service.spec.ts` | ✅ Implemented |

### CORE: Guards, Interceptors, and Core Logic Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-U-CORE-001** | `OrgContextGuard` must correctly grant access to Platform Admins for any organization context. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-U-CORE-002** | `OrgContextGuard` must throw a `ForbiddenException` if an organization user attempts to access an org they do not belong to. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-U-CORE-003** | `PermissionsGuard` must correctly validate the permissions present in the `activeContext` against the permissions required by an endpoint's `@Permissions` decorator. | `permissions.guard.spec.ts` | 🟡 Partially Implemented |
| **R-U-CORE-004** | `JwtAuthGuard` must successfully validate a JWT and reject invalid ones. | `jwt.guard.spec.ts` | ✅ Implemented |
| **R-U-CORE-005** | `AuthContextTokenGuard` must correctly validate and burn ACT tokens. | `act.guard.spec.ts` | ✅ Implemented |

### EVENTS: Event Listener Rules

| Rule ID | Description | Test File(s) |
|---|---|---|
| **R-U-EVNT-001** | `OrganizationNameChangedListener` must update the denormalized `organizationName` on all relevant `UserMembershipEntity` records. | `organization-name-changed.listener.spec.ts` | ✅ Implemented |
| **R-U-EVNT-002** | `OrganizationSuspendedListener` must set the status of all users in that organization to `SUSPENDED`. | `organization-suspended.listener.spec.ts` | ✅ Implemented |
| **R-U-EVNT-003** | `OrganizationCreatedListener` must correctly provision an initial admin user upon receiving an `OrganizationCreated` event. | `organization-created.listener.spec.ts` | ✅ Implemented |
