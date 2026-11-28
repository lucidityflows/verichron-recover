# Documented System Rules for E2E Testing

This document lists the core system invariants and architectural rules that our E2E tests prove. Each rule has a unique ID that is referenced in the corresponding test file.

## System Architecture

The Debt Lucidity Solutions platform consists of 10 microservices:
1. **api-users** - User authentication, authorization, and RBAC
2. **api-organizations** - Organization management and onboarding
3. **api-debtors** - Debtor profile management and identity linking
4. **api-debts** - Debt portfolio management and creditor master data
5. **api-transactions** - Payment and transaction processing
6. **api-communications** - Email, SMS, and notification delivery
7. **api-collectors** - Collector assignment and performance tracking
8. **api-voice** - Voice call management and IVR systems
9. **api-workflows** - Business process orchestration
10. **api-automations** - Automated task execution and scheduling

All microservices are fully operational and ready for E2E testing. Tests marked with ⏳ indicate test cases that need to be implemented during the testing process.

---

### **Event-Driven Architecture Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-EVENT-001**  | The event bus infrastructure must reliably publish and receive messages across topics.                  | `TC-EVENT-001-event-poc.e2e.spec.ts`                                         |
| **R-EVENT-002**  | When an organization's settings are updated, an `OrganizationSettingsUpdated` event must be published. | `TC-EVENT-002-org-settings-update-publishes-event.e2e.spec.ts`             |
| **R-EVENT-003**  | When an organization's name is changed, an `OrganizationNameChanged` event must be published.          | `TC-DATA-001-org-name-change-subscription.e2e.spec.ts`                    |

### **Data Consistency Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-DATA-001**   | Changes to an organization's name must be propagated to the denormalized `organization_name` field in all associated `user_memberships` records. | `TC-DATA-001-org-name-change-subscription.e2e.spec.ts`                    |

### **Onboarding & Provisioning Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-PROV-001**   | A platform administrator must be able to provision a new organization, which places the organization into a `PROVISIONING` state and publishes an `OrganizationCreated` event. | `TC-PROV-001-platform-admin-org-creation.e2e.spec.ts`                     |

### **Authentication & Authorization Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-AUTH-001**   | Organization users must complete a two-step authentication flow: (1) credentials → ACT cookie + organization list, (2) organization selection → org-scoped JWT. ACTs must be single-use only (burned after exchange) to prevent replay attacks. JWTs must contain correct user identity, organization context, and permissions. | `TC-AUTH-001-two-step-login.e2e.spec.ts`                                  |
| **R-AUTH-002**   | A platform administrator must be able to acquire a platform-level token (with a `null` organization context) to perform system-wide actions. | Implicit in all tests requiring a platform admin.             |
| **R-AUTH-003**   | Users with memberships in multiple organizations must be able to switch organization contexts without re-authenticating. The switch-context flow issues a new ACT, and the subsequent token exchange publishes a ContextSwitched event for audit tracking. Permissions are recalculated for the new organization. Users can only switch to organizations they belong to. | `TC-USR-AUTH-003-context-switching.e2e.spec.ts`                               |
| **R-AUTH-004**   | Users must be able to refresh their access tokens without re-authenticating. Refresh tokens enable long-running sessions (hours/days) while maintaining short-lived access tokens (15min) for security. The refresh flow generates new access tokens while preserving the same user identity, organization context, and permissions. Refresh tokens validate user existence, membership status, and organization access. Invalid or expired refresh tokens are rejected. | `TC-AUTH-004-token-refresh.e2e.spec.ts`                                   |
| **R-AUTH-005**   | JWT signatures must be cryptographically validated to prevent forgery attacks. JWTs signed with incorrect secrets, tampered payloads, or unsigned tokens (algorithm: none) must be rejected with 401 Unauthorized. Only tokens signed with the correct JWT_SECRET are accepted. This prevents attackers from modifying user IDs, escalating privileges, accessing other organizations, or extending token lifetime. | `TC-AUTH-006-invalid-jwt-signature.e2e.spec.ts`                            |
| **R-AUTH-006**   | All protected endpoints must reject unauthenticated requests with 401 Unauthorized. Missing Authorization headers, empty headers, malformed Bearer formats, and wrong authentication schemes must all be consistently rejected. This enforces default-deny security posture and ensures no protected resources are accidentally exposed. | `TC-AUTH-007-missing-jwt.e2e.spec.ts`                                      |
| **R-AUTH-DEBTOR-001** | DEBTOR users must complete two-step authentication and receive multi-organization access tokens. Unlike ORGANIZATION_USER tokens (single org), DEBTOR JWTs contain organizationIds[] array with ALL organizations the debtor has access to. JWT structure includes userType: DEBTOR, debtorPermissions (self-scoped), and isDebtor: true flag. This enables unified debt portal access across multiple collection agencies while maintaining ownership-based access control. | `TC-USR-AUTH-011-debtor-multi-org-login.e2e.spec.ts` |
| **R-AUTH-DEBTOR-002** | DEBTOR refresh tokens must dynamically update organizationIds[] array when memberships change. When debtors accept invitations to new organizations or have memberships removed, the refresh token endpoint must return updated JWTs reflecting current organization access. Refresh tokens are reusable (no rotation) and validate membership status on each refresh. This ensures debtors always have current access permissions without re-authenticating. | `TC-USR-AUTH-012-debtor-refresh-updates-orgs.e2e.spec.ts` |
| **R-AUTH-DEBTOR-003** | DEBTOR JWT structure must be validated at authentication layer. JwtStrategy must enforce ALL required fields: organizationIds (non-empty array), debtorPermissions (array), and isDebtor: true flag. Missing or invalid fields result in 401 Unauthorized with descriptive error messages. This prevents malformed tokens from bypassing access controls or causing runtime errors in business logic. Structural validation happens before any request processing. | `TC-USR-AUTH-013-debtor-token-validation.e2e.spec.ts` |
| **R-DEBTOR-PERM-001** | DEBTOR permissions must be completely isolated from organization permissions using :self: scoped convention. DEBTOR JWTs contain debtorPermissions (e.g., debtor:self:read, debtor:self:pay) and NEVER contain organization permissions (e.g., debt:read, user:read). This prevents debtors from accessing org management features, viewing other debtors' data, or escalating privileges. PermissionsGuard enforces isolation with 403 Forbidden for unauthorized access attempts. | `TC-DBT-PERM-001-debtor-self-scoped-permissions.e2e.spec.ts` |

### **Security & Access Control Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-SEC-001**    | The `/onboarding` endpoint must be restricted to platform administrators only. Regular organization admins, managers, and collectors cannot provision new organizations. | `TC-SEC-001-onboarding-authorization.e2e.spec.ts`                        |
| **R-SEC-002**    | Users must only be able to access data from organizations they belong to. The system must enforce complete data isolation between organizations at both HTTP and service layers. Users cannot spoof x-org-id headers, access resources via route params, or see other organizations in list endpoints. | `TC-SEC-002-org-data-isolation.e2e.spec.ts`                               |
| **R-SEC-003**    | All database queries must use parameterized statements to prevent SQL injection attacks. User-supplied input in query filters, path parameters, and request bodies must never be concatenated directly into SQL queries. Classic injection (OR 1=1), UNION-based, comment-based (DROP TABLE), and boolean-based blind injection attempts must all be rejected. The system must maintain data integrity and proper error responses during injection attempts. | `TC-SEC-003-sql-injection-prevention.e2e.spec.ts`                        |

### **RBAC & Permission Management Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-RBAC-001**   | Organization admins must be able to manage the complete lifecycle of custom roles: create roles with names/descriptions, assign/remove permissions, update role details, delete custom roles (system roles protected), and assign roles to users. Role management enforces complete organization isolation - admins can only manage roles within their organization. System roles (ORG_ADMIN, ORG_USER) cannot be deleted. Roles cannot be deleted while users are assigned. All role operations return paginated responses with proper validation (role names unique per org, permission IDs validated as UUIDs, organizationId sourced from JWT not request body). | `TC-RBAC-001-role-management.e2e.spec.ts`                                 |

### **User Management Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-USERS-001**  | When an admin creates a user, an invitation token is generated and stored. Users can activate their account using the token, setting their password, and transitioning from PENDING to ACTIVE status. Tokens are single-use, time-limited (7 days), and properly validate expiration and format. Activated users can login immediately. UserActivated event is published. | `TC-USERS-001-user-activation.e2e.spec.ts`                                 |
| **R-USERS-002**  | Platform administrators must be able to list all users across all organizations (with organizationId: null JWT context). Platform admins bypass organization-level filtering and have access to perform user management operations system-wide. Regular organization users only see users within their own organization. | `TC-USERS-002-user-lifecycle-management.e2e.spec.ts`                       |

---

### **Onboarding & Provisioning Rules (Additional)**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-PROV-002** | Onboarding endpoint must validate all input data (required fields, formats, constraints) and reject invalid payloads with descriptive field-level errors. | `TC-ORG-ONBOARD-003-invalid-data-validation.e2e.spec.ts` |
| **R-PROV-003** | Failed user provisioning should not block organization creation. Event-driven architecture provides eventual consistency and resilience against downstream failures. | Not yet implemented ⏳ |

### **Organization Management Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-ORG-001**  | Organization list endpoints must support pagination with limit/offset/page parameters and return metadata (total, page, pageSize, totalPages). | `TC-ORG-PROFILE-011-list-pagination.e2e.spec.ts` |
| **R-ORG-002**  | Organization queries must support filtering by organizationType, status, name (partial match) with server-side filtering and sorting. | `TC-ORG-PROFILE-012-filtering-sorting.e2e.spec.ts` |
| **R-ORG-003**  | Organizations can have multiple addresses but only one primary address per category. Business rule must be enforced at creation/update. | Not yet implemented ⏳ |
| **R-ORG-004**  | Requests with non-existent organization IDs must return 404 Not Found with clear error messages, without disclosing existence via error differences. | `TC-ORG-PROFILE-007-invalid-org-id-404.e2e.spec.ts` |
| **R-ORG-005**  | Malformed UUID parameters must return 400 Bad Request with validation errors before database queries (fail fast for performance and security). | `TC-ORG-PROFILE-008-malformed-uuid-400.e2e.spec.ts` |
| **R-ORG-006**  | Organization status changes must be reactivatable. Suspended organizations can transition back to ACTIVE status via admin action. | Not yet implemented ⏳ |

### **Settings Management Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-SETTINGS-001** | Organization settings must validate against FullSettingsDto schema before persisting. Invalid data rejected with field-level validation errors. | Not yet implemented ⏳ |
| **R-SETTINGS-002** | Non-admin users cannot modify organization settings. Requires orgs:settings:write permission. | `TC-ORG-SETTINGS-002-non-admin-cannot-update-settings.e2e.spec.ts` |

### **Debtor Invitation & User Linking Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-DEBTOR-INVITE-001** | Organizations can invite debtors by debtorId. If user doesn't exist, create user account. If exists, add additional organization membership. User receives invitation email with activation token. | Not yet implemented ⏳ |
| **R-DEBTOR-INVITE-002** | Email addresses must be globally unique per debtor profile. Same email cannot be linked to multiple debtor profiles. Returns 409 Conflict if violation attempted. | `TC-DBT-INVITE-003-mismatched-debtor-id.e2e.spec.ts` |
| **R-DEBTOR-INVITE-003** | Existing debtor users can be invited to additional organizations. System reuses user account and creates additional UserMembershipEntity with DEBTOR role. No duplicate users created. | Not yet implemented ⏳ |

### **Debtor Data Access & Ownership Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-DEBTOR-ACCESS-001** | Debtors can access all their debts across all member organizations. Service layer queries: WHERE debtor_user_id = :userId AND organization_id IN (:organizationIds). | Not yet implemented ⏳ |
| **R-DEBTOR-ACCESS-002** | Debtors cannot access other debtors' data. Ownership-based filtering enforced at database level. Returns 404 for unauthorized access attempts. | Not yet implemented ⏳ |
| **R-DEBTOR-ACCESS-003** | Debtor access is scoped by organizationIds array in JWT. Removed org memberships immediately block access after token refresh. | Not yet implemented ⏳ |

### **Debtor Guard & Permission Enforcement Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-DEBTOR-GUARD-001** | OrgContextGuard must create DebtorContext (not OrgContext) for DEBTOR userType. Context includes userId, organizationIds array, and debtorPermissions. | Not yet implemented ⏳ |
| **R-DEBTOR-GUARD-002** | DebtorOwnershipGuard validates resource ownership before controller access. Validates debt.debtorUserId === activeContext.userId AND debt.organizationId IN activeContext.organizationIds. | Not yet implemented ⏳ |

### **Debtor Compliance Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-DEBTOR-GDPR-001** | Debtors can export all their data across organizations (GDPR Article 15 Right of Access). Export aggregates data from api-debts, api-transactions, api-communications, api-debtors. | Not yet implemented ⏳ |
| **R-DEBTOR-SOC2-001** | Organizations cannot see debtor's memberships in other organizations. Complete organization-to-organization isolation for SOC2 compliance. organizationIds array never exposed to org admins. | Not yet implemented ⏳ |
| **R-DEBTOR-AUDIT-001** | Debtor actions must publish audit events (DebtorDebtAccessed, DebtorPaymentCreated, DebtorProfileAccessed) with userId, debtorId, organizationIds, ipAddress, timestamp for compliance reporting. | Not yet implemented ⏳ |

### **Debtor Edge Cases Rules**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-DEBTOR-EDGE-001** | Users without active organization memberships cannot generate tokens. Login succeeds (credentials valid) but token generation fails with clear error. | Not yet implemented ⏳ |
| **R-DEBTOR-EDGE-002** | Mid-session membership changes take effect after token refresh (eventual consistency). Access tokens remain valid for duration, refresh token picks up membership changes. | Not yet implemented ⏳ |
| **R-DEBTOR-EDGE-003** | System policy on dual-role scenarios (user is both organization user and debtor) must be clearly defined and enforced consistently. | Not yet implemented ⏳ |

### **User Management Rules (Additional)**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-USERS-003**  | Duplicate email addresses cannot be registered. Email uniqueness enforced at database level. Returns 409 Conflict on violation. | Not yet implemented ⏳ |
| **R-USERS-004**  | Manager users can invite team members but cannot delete users. Requires user:create permission but lacks user:delete permission. Clear permission boundaries enforced. | Not yet implemented ⏳ |
| **R-USERS-005**  | User actions must be audited with actor information. All state-changing events include createdBy/updatedBy/changedBy fields for compliance. | Not yet implemented ⏳ |

### **Security & Access Control Rules (Additional)**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-SEC-004**  | User input must be sanitized to prevent XSS attacks. Script tags either sanitized in storage or escaped in response serialization. | Not yet implemented ⏳ |
| **R-SEC-005**  | Concurrent operations on same entity must maintain data consistency. Last-write-wins or optimistic locking depending on use case. | Not yet implemented ⏳ |

### **RBAC & Permission Management Rules (Additional)**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-RBAC-002** | Permission checks must be available as API endpoints for feature flag systems. Supports both single and bulk permission checks. | Not yet implemented ⏳ |
| **R-RBAC-003** | Permissions must be grouped by resource for UI rendering. GET /rbac/permissions/grouped returns permissions organized by resource type. | Not yet implemented ⏳ |

### **Authentication & Authorization Rules (Additional)**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-AUTH-007** | Refresh tokens may implement single-use enforcement (rotation) for enhanced security. Prevents token replay attacks. | Not yet implemented ⏳ |
| **R-AUTH-008** | Authentication system must handle high concurrent load. All users can log in simultaneously with acceptable response times (< 2s p95). | Not yet implemented ⏳ |

---

### **Debtor Management Rules (`api-debtors`)**

| Rule ID      | Description                                                                                             | Proven By                                                     |
|--------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **R-DEBTOR-IMPORT-001** | A portfolio import must create `DebtorIdentity` and `DebtorProfile` records for new debtors and link them correctly within the organization. | `TC-DBT-IMPORT-001-New-Debtor-Creation.md` ⏳ |
| **R-DEBTOR-IMPORT-002** | A portfolio import must identify existing debtors (via SSN hash or email) and update their `DebtorProfile` without creating duplicate `DebtorIdentity` records. | `TC-DBT-IMPORT-002-Existing-Debtor-Update.md` ⏳ |
| **R-DEBTOR-MODEL-001** | The system must support a one-to-many relationship where a single `DebtorIdentity` can be associated with multiple `DebtorProfile` records, each scoped to a different organization. | `TC-DBT-MODEL-001-Multi-Org-Debtor.md` ⏳ |
| **R-DEBTOR-API-001** | All CRUD operations (Create, Read, Update, Delete) on `DebtorProfile` endpoints must be properly implemented, permissioned, and scoped to the user's organization. | `TC-DBT-API-001-Profile-CRUD.md` ⏳ |
| **R-DEBTOR-COMPLIANCE-001**| A "right-to-be-forgotten" request on a `DebtorProfile` must result in a soft delete of that profile, leaving the core `DebtorIdentity` and other `DebtorProfile` records for that identity untouched. | `TC-DBT-COMPLIANCE-001-Right-To-Be-Forgotten.md` ⏳ |
| **R-DEBTOR-LINK-001** | The system must link a `userId` from `api-users` to an existing `DebtorIdentity` upon consumption of a `USERS_DEBTOR_USER_CREATED_BATCH` event, and publish a `DEBTORS_USER_LINKED` event upon completion. | `TC-DBT-LINK-001-User-Linkage.md` ⏳ |
| **R-DEBTOR-DOCS-001** | The system must allow document uploads for a `DebtorProfile`, store metadata securely, and provide time-limited signed URLs for download, abstracting the underlying storage provider (e.g., GCS). | Not yet implemented ⏳ |
| **R-DEBTOR-PII-001** | Access to sensitive PII in the `DemographicsModule` (e.g., SSN) must be strictly permissioned and must trigger an audit log event upon access. | Not yet implemented ⏳ |
| **R-DEBTOR-VERIFY-001** | The system must support initiating a verification request for a `DebtorProfile`, tracking its status through a defined lifecycle (`PENDING`, `IN_PROGRESS`, `VERIFIED`/`FAILED`), and publishing events on status change. | `TC-DBT-VERIFY-001-Verification-Lifecycle.md` ⏳ |

---

## Test Coverage Summary

**Last Updated:** 2025-12-30

**Test Execution Results:**
- **Total Test Suites:** 28
- **Passing Test Suites:** 27
- **Failing Test Suites:** 1
- **Total Tests:** 157
- **Passing Tests:** 156
- **Failing Tests:** 1
- **Test Pass Rate:** 99.4%

**Currently Failing:**
- `TC-DEBTOR-JOURNEY-001-new-debtor-lifecycle.e2e.spec.ts` - Issue with debtor invitation response structure (userId field undefined)

**System Rules Coverage:**
- **Fully Implemented & Tested:** 31 rules
- **Pending Implementation:** 30 rules
- **Total Documented Rules:** 61 rules
- **Coverage Rate:** 50.8%

**Coverage by Category:**
- ✅ **Event-Driven Architecture:** 3/3 (100%)
- ✅ **Data Consistency:** 1/1 (100%)
- ✅ **Onboarding & Provisioning:** 2/3 (67%)
- ✅ **Authentication & Authorization (Core):** 6/8 (75%)
- ✅ **Authentication & Authorization (Debtor):** 3/3 (100%)
- ✅ **Security & Access Control:** 3/5 (60%)
- ✅ **RBAC & Permission Management:** 1/3 (33%)
- ✅ **User Management:** 2/5 (40%)
- ✅ **Organization Management:** 4/6 (67%)
- ✅ **Settings Management:** 1/2 (50%)
- ⏳ **Debtor Permissions:** 1/1 (100%)
- ⏳ **Debtor Invitation & User Linking:** 1/3 (33%)
- ⏳ **Debtor Data Access & Ownership:** 0/3 (0%)
- ⏳ **Debtor Guard & Permission Enforcement:** 0/2 (0%)
- ⏳ **Debtor Compliance:** 0/3 (0%)
- ⏳ **Debtor Edge Cases:** 0/3 (0%)
- ⏳ **Debtor Management (api-debtors):** 0/9 (0%)

**Next Priority Areas:**
1. Fix failing debtor journey test
2. Implement RBAC endpoint tests (R-RBAC-002, R-RBAC-003)
3. Implement debtor data access tests (R-DEBTOR-ACCESS-001 through R-DEBTOR-ACCESS-003)
4. Implement user management audit tests (R-USERS-003 through R-USERS-005)
5. Implement api-debtors integration tests (R-DEBTOR-IMPORT-001 through R-DEBTOR-VERIFY-001)