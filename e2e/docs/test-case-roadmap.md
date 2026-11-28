# E2E Test Case Roadmap (Unimplemented Rules)

This document provides a concise overview of E2E system rules that are currently either pending implementation or blocked by external dependencies. This serves as a roadmap for future testing efforts.

For detailed specifications of all system rules (both implemented and unimplemented), please refer to [`e2e/docs/system-rules.md`](e2e/docs/system-rules.md).
For detailed test case specifications, refer to the documents in [`e2e/test-specs/`](e2e/test-specs/).

---

## Unimplemented System Rules

**Last Updated:** 2025-12-30

**Summary:**
- **Total Unimplemented Rules:** 35
- **All microservices are operational** - no tests are blocked by infrastructure dependencies
- **Rules with test specs ready:** 7 (debtor management rules)
- **Rules requiring new test specs:** 28

| Rule ID      | Description                                                                                             | Status                                                                                                                              |
|--------------|---------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| **R-PROV-003** | Failed user provisioning should not block organization creation. Event-driven architecture provides eventual consistency and resilience against downstream failures. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-ORG-003**  | Organizations can have multiple addresses but only one primary address per category. Business rule must be enforced at creation/update. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-ORG-006**  | Organization status changes must be reactivatable. Suspended organizations can transition back to ACTIVE status via admin action. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-SETTINGS-001** | Organization settings must validate against FullSettingsDto schema before persisting. Invalid data rejected with field-level validation errors. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-INVITE-001** | Organizations can invite debtors by debtorId. If user doesn't exist, create user account. If exists, add additional organization membership. User receives invitation email with activation token. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-INVITE-003** | Existing debtor users can be invited to additional organizations. System reuses user account and creates additional UserMembershipEntity with DEBTOR role. No duplicate users created. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-ACCESS-001** | Debtors can access all their debts across all member organizations. Service layer queries: WHERE debtor_user_id = :userId AND organization_id IN (:organizationIds). | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-ACCESS-002** | Debtors cannot access other debtors' data. Ownership-based filtering enforced at database level. Returns 404 for unauthorized access attempts. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-ACCESS-003** | Debtor access is scoped by organizationIds array in JWT. Removed org memberships immediately block access after token refresh. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-GUARD-001** | OrgContextGuard must create DebtorContext (not OrgContext) for DEBTOR userType. Context includes userId, organizationIds array, and debtorPermissions. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-GUARD-002** | DebtorOwnershipGuard validates resource ownership before controller access. Validates debt.debtorUserId === activeContext.userId AND debt.organizationId IN activeContext.organizationIds. | ⏳ Pending (Not yet implemented)                                                           |
| **R-DEBTOR-GDPR-001** | Debtors can export all their data across organizations (GDPR Article 15 Right of Access). Export aggregates data from api-debts, api-transactions, api-communications, api-debtors. | ⏳ Pending (Not yet implemented) |
| **R-DEBTOR-SOC2-001** | Organizations cannot see debtor's memberships in other organizations. Complete organization-to-organization isolation for SOC2 compliance. organizationIds array never exposed to org admins. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-AUDIT-001** | Debtor actions must publish audit events (DebtorDebtAccessed, DebtorPaymentCreated, DebtorProfileAccessed) with userId, debtorId, organizationIds, ipAddress, timestamp for compliance reporting. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-EDGE-001** | Users without active organization memberships cannot generate tokens. Login succeeds (credentials valid) but token generation fails with clear error. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-EDGE-002** | Mid-session membership changes take effect after token refresh (eventual consistency). Access tokens remain valid for duration, refresh token picks up membership changes. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-EDGE-003** | System policy on dual-role scenarios (user is both organization user and debtor) must be clearly defined and enforced consistently. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-USERS-003**  | Duplicate email addresses cannot be registered. Email uniqueness enforced at database level. Returns 409 Conflict on violation. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-USERS-004**  | Manager users can invite team members but cannot delete users. Requires user:create permission but lacks user:delete permission. Clear permission boundaries enforced. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-USERS-005**  | User actions must be audited with actor information. All state-changing events include createdBy/updatedBy/changedBy fields for compliance. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-SEC-004**  | User input must be sanitized to prevent XSS attacks. Script tags either sanitized in storage or escaped in response serialization. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-SEC-005**  | Concurrent operations on same entity must maintain data consistency. Last-write-wins or optimistic locking depending on use case. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-RBAC-002** | Permission checks must be available as API endpoints for feature flag systems. Supports both single and bulk permission checks. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-RBAC-003** | Permissions must be grouped by resource for UI rendering. GET /rbac/permissions/grouped returns permissions organized by resource type. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-AUTH-007** | Refresh tokens may implement single-use enforcement (rotation) for enhanced security. Prevents token replay attacks. | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-AUTH-008** | Authentication system must handle high concurrent load. All users can log in simultaneously with acceptable response times (< 2s p95). | ⏳ Pending (Not yet implemented)                                                                                        |
| **R-DEBTOR-IMPORT-001** | A portfolio import must create `DebtorIdentity` and `DebtorProfile` records for new debtors and link them correctly within the organization. | ⏳ Pending (Test spec exists: `TC-DBT-IMPORT-001-New-Debtor-Creation.md`) |
| **R-DEBTOR-IMPORT-002** | A portfolio import must identify existing debtors (via SSN hash or email) and update their `DebtorProfile` without creating duplicate `DebtorIdentity` records. | ⏳ Pending (Test spec exists: `TC-DBT-IMPORT-002-Existing-Debtor-Update.md`) |
| **R-DEBTOR-MODEL-001** | The system must support a one-to-many relationship where a single `DebtorIdentity` can be associated with multiple `DebtorProfile` records, each scoped to a different organization. | ⏳ Pending (Test spec exists: `TC-DBT-MODEL-001-Multi-Org-Debtor.md`) |
| **R-DEBTOR-API-001** | All CRUD operations (Create, Read, Update, Delete) on `DebtorProfile` endpoints must be properly implemented, permissioned, and scoped to the user's organization. | ⏳ Pending (Test spec exists: `TC-DBT-API-001-Profile-CRUD.md`) |
| **R-DEBTOR-COMPLIANCE-001**| A "right-to-be-forgotten" request on a `DebtorProfile` must result in a soft delete of that profile, leaving the core `DebtorIdentity` and other `DebtorProfile` records for that identity untouched. | ⏳ Pending (Test spec exists: `TC-DBT-COMPLIANCE-001-Right-To-Be-Forgotten.md`) |
| **R-DEBTOR-LINK-001** | The system must link a `userId` from `api-users` to an existing `DebtorIdentity` upon consumption of a `USERS_DEBTOR_USER_CREATED_BATCH` event, and publish a `DEBTORS_USER_LINKED` event upon completion. | ⏳ Pending (Test spec exists: `TC-DBT-LINK-001-User-Linkage.md`) |
| **R-DEBTOR-DOCS-001** | The system must allow document uploads for a `DebtorProfile`, store metadata securely, and provide time-limited signed URLs for download, abstracting the underlying storage provider (e.g., GCS). | ⏳ Pending (Not yet implemented) |
| **R-DEBTOR-PII-001** | Access to sensitive PII in the `DemographicsModule` (e.g., SSN) must be strictly permissioned and must trigger an audit log event upon access. | ⏳ Pending (Not yet implemented) |
| **R-DEBTOR-VERIFY-001** | The system must support initiating a verification request for a `DebtorProfile`, tracking its status through a defined lifecycle (`PENDING`, `IN_PROGRESS`, `VERIFIED`/`FAILED`), and publishing events on status change. | ⏳ Pending (Test spec exists: `TC-DBT-VERIFY-001-Verification-Lifecycle.md`) |

---

## Recommended Implementation Priorities

### High Priority (Core Security & User Management)
These rules address critical security, authorization, and user management gaps:
1. **R-USERS-003** - Duplicate email prevention (data integrity)
2. **R-USERS-004** - Manager permission boundaries (RBAC enforcement)
3. **R-SEC-004** - XSS prevention (security vulnerability)
4. **R-RBAC-002** - Permission check API (required for UI feature flags)
5. **R-RBAC-003** - Grouped permissions API (required for UI role editor)

### Medium Priority (Debtor Access Control)
These rules enable debtor portal functionality with proper data isolation:
1. **R-DEBTOR-ACCESS-001** - Debtor multi-org data access
2. **R-DEBTOR-ACCESS-002** - Debtor ownership filtering
3. **R-DEBTOR-ACCESS-003** - Membership-based access scoping
4. **R-DEBTOR-GUARD-001** - DebtorContext creation
5. **R-DEBTOR-GUARD-002** - DebtorOwnershipGuard

### Medium Priority (Debtor Management - Test Specs Ready)
These have existing test specs and can be implemented immediately:
1. **R-DEBTOR-IMPORT-001** - New debtor creation via import
2. **R-DEBTOR-IMPORT-002** - Existing debtor updates
3. **R-DEBTOR-MODEL-001** - Multi-org debtor model
4. **R-DEBTOR-API-001** - Debtor profile CRUD
5. **R-DEBTOR-LINK-001** - User-to-debtor identity linking
6. **R-DEBTOR-VERIFY-001** - Verification lifecycle

### Lower Priority (Compliance & Advanced Features)
Important but can be deferred until core functionality is solid:
1. **R-DEBTOR-GDPR-001** - GDPR data export
2. **R-DEBTOR-SOC2-001** - Cross-org isolation compliance
3. **R-DEBTOR-AUDIT-001** - Debtor action audit events
4. **R-USERS-005** - User action auditing
5. **R-AUTH-007** - Token rotation
6. **R-AUTH-008** - High concurrency load testing
7. **R-SEC-005** - Concurrent operation consistency
8. **R-DEBTOR-DOCS-001** - Document upload/download
9. **R-DEBTOR-PII-001** - PII access auditing

### Future Enhancements
Nice-to-have features for future iterations:
1. **R-PROV-003** - Resilient provisioning (async user creation)
2. **R-ORG-003** - Primary address enforcement
3. **R-ORG-006** - Organization reactivation
4. **R-SETTINGS-001** - Settings schema validation
5. **R-DEBTOR-INVITE-001** - Debtor invitation flow
6. **R-DEBTOR-INVITE-003** - Multi-org debtor invitations
7. **R-DEBTOR-EDGE-001** - No-membership error handling
8. **R-DEBTOR-EDGE-002** - Mid-session membership changes
9. **R-DEBTOR-EDGE-003** - Dual-role user policy
10. **R-DEBTOR-COMPLIANCE-001** - Right-to-be-forgotten