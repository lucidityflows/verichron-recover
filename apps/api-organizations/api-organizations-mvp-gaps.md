# API-Organizations MVP Implementation Gaps

**Status**: Temporary Document - To be deleted upon MVP completion.

This document aggregates the identified implementation gaps and documentation inconsistencies that are required for the Minimum Viable Product (MVP) of the `api-organizations` microservice.

**Important Note**: When an item listed below is implemented or corrected, the corresponding annotation in its respective documentation (e.g., `apps/api-organizations/docs/architecture/overview.md`, `apps/api-organizations/docs/events/overview.md`, or relevant code comments) **must be removed or updated** to reflect its completed status.

---

## Identified Gaps and Inconsistencies

### From Developer Guide: Guards (`apps/api-organizations/docs/developer-guide/guards.md`)

*   **Inconsistency**: Global Security Pipeline Claims `PermissionsGuard` is globally registered.
    *   **Actual**: `PermissionsGuard` is *not* globally registered in `app.module.ts`, but applied via `@UseGuards()` decorator at the controller or method level.
    *   **Recommendation**: Update the "The Global Security Pipeline" section to accurately reflect the non-global application of `PermissionsGuard`.

*   **Incompleteness**: `OrgContextGuard` documentation does not mention `UserType.DEBTOR` handling.
    *   **Actual**: `OrgContextGuard` explicitly handles `UserType.DEBTOR` and sets `activeContext` with `organizationIds` from the JWT claims.
    *   **Recommendation**: Update the "How it Works" section for `OrgContextGuard` to include the handling of `UserType.DEBTOR` and its specific context population.

*   **Inconsistency**: `RoleGuard` documentation claims it checks for `PlatformRoles`.
    *   **Actual**: `RoleGuard` *only* checks `activeContext.roles` (organization-level roles) and *does not* check for platform-level roles (`activeContext.platformRoles`).
    *   **Recommendation**: Remove the claim that `RoleGuard` checks for `PlatformRoles` from its "How it Works" section.

*   **Inconsistency**: `PermissionsGuard` documentation claims it's typically registered globally.
    *   **Actual**: It's *not* globally registered in `app.module.ts`.
    *   **Recommendation**: Update the "Usage" section for `PermissionsGuard` to clarify that it is applied via `@UseGuards()` at the controller or method level.

*   **Inaccuracy**: `AuthContextTokenGuard` section is present but the guard does not exist in `api-organizations`.
    *   **Actual**: No `AuthContextTokenGuard` or `ActStrategy` is implemented in `api-organizations`. This section was likely copied from `api-users` documentation.
    *   **Recommendation**: Remove the entire "AuthContextTokenGuard" section from `guards.md`.

### From Developer Guide: Decorators (`apps/api-organizations/docs/developer-guide/decorators.md`)

*   **Inconsistency**: `@PlatformRoles()` decorator documentation implies `RoleGuard` as its "Primary Consumer".
    *   **Actual**: `RoleGuard` does *not* check `PlatformRoles`. The `PlatformAdminGuard` (which is typically applied via `@UseGuards()`) is the consumer of `@PlatformRoles()`.
    *   **Recommendation**: Update the "Primary Consumer" for `@PlatformRoles()` to correctly identify `PlatformAdminGuard`.

### From Testing Philosophy (`apps/api-organizations/docs/testing-philosophy.md`)

*   **Test Coverage Gap**: `R-O-EVNT-001` - Event listeners correctly process incoming events and handle validation errors.
    *   **Actual**: No unit test files (`*.listener.spec.ts`) for event listeners were found in the `api-organizations` microservice.
    *   **Recommendation**: Create unit tests for all event listeners to ensure they correctly process incoming events and handle validation errors. Until then, keep its status as `❌ Not Implemented`.

### From Developer Guide: Error Codes (`apps/api-organizations/docs/developer-guide/error-codes.md`)

*   **Inconsistency**: `ORGS_SETTINGS_001` - `InvalidSettingsException`.
    *   **Document Claim**: Claims it extends `BaseException` and has error code `ORGS_SETTINGS_001`.
    *   **Actual**: `InvalidSettingsException` (in `src/settings/errors.ts`) extends `BadRequestException` and does *not* set an `errorCode` following the `BaseException` pattern.
    *   **Recommendation**: Refactor `InvalidSettingsException` to extend `BaseException` and correctly set `ORGS_SETTINGS_001` as its error code, or update the `error-codes.md` to reflect its current implementation (extending `BadRequestException` without an explicit `errorCode`). The former (refactoring the code) is preferred for consistency with the established error handling pattern.

### From RBAC Guide (`apps/api-organizations/docs/rbac.md`)

*   **Inconsistency**: Authorization Flow Diagram is misleading.
    *   **Problem**: Depicts `PermissionsGuard` and `PlatformAdminGuard` in a sequence as if globally applied, which is not the case. `PermissionsGuard` is not global, and `PlatformAdminGuard`'s position/usage is not accurately represented.
    *   **Recommendation**: Update the Authorization Flow diagram to accurately reflect that `PermissionsGuard` and `PlatformAdminGuard` are applied via `@UseGuards()` (i.e., endpoint-specific) rather than being part of the global pipeline sequence.

*   **Inconsistency**: Platform-Level Roles section for "Checked via: `@PlatformRoles()` decorator + `PlatformAdminGuard`" and its interaction with `RoleGuard`.
    *   **Problem**: The description implies `RoleGuard` might check `PlatformRoles`, but the audit of `guards.md` revealed `RoleGuard` does *not* check for `PlatformRoles`. This implies `PlatformAdminGuard` is solely responsible for checking `@PlatformRoles()`.
    *   **Recommendation**: Clarify that `PlatformAdminGuard` is the primary and sole consumer for `@PlatformRoles()`, and ensure `RoleGuard`'s documentation (in `guards.md`) accurately states it only checks organization-level roles. This document (`rbac.md`) should clearly state the `PlatformAdminGuard` is responsible for `@PlatformRoles()`.

---

This temporary document will serve as our consolidated checklist for MVP completion and documentation accuracy.
