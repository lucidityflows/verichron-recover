# Centralized Authentication & Authorization Architecture

**Version:** 1.1
**Date:** 2025-12-20
**Status:** Approved
**Decision:** Standardize UserType and Role hierarchy across microservices

---

## User Types & Multi-Tenancy Patterns

The platform supports three distinct user types, each with different multi-tenancy and authorization patterns:

### 1. Platform User (`PLATFORM_USER`)

**JWT Structure:**
```json
{
  "sub": "user-id",
  "userType": "PLATFORM_USER",
  "https://verichroninc.com/claims": {
    "organizationId": null,
    "platformRoles": ["PLATFORM_ADMIN"],
    "platformPermissions": ["platform:orgs:create", "platform:orgs:read", ...]
  }
}
```

**Guard Behavior:**
- Bypass organization context validation.
- Validated via `platformPermissions`.
- **Roles**: `PLATFORM_ADMIN`, `PLATFORM_SUPPORT`.

---

### 2. Organization User (`ORG_USER`)

**JWT Structure:**
```json
{
  "sub": "user-id",
  "userType": "ORG_USER",
  "https://verichroninc.com/claims": {
    "organizationId": "org-A",
    "roles": ["ORG_ADMIN"],
    "permissions": ["orgs:read", "debtors:read", ...]
  }
}
```

**Guard Behavior:**
- Strictly scoped to a single `organizationId`.
- Optional `x-org-id` header must match token claims.
- **Roles**: `ORG_ADMIN`, `ORG_MANAGER`, `ORG_TEAM_LEAD`, `ORG_COLLECTOR`, `ORG_VIEWER`.

---

### 3. Debtor User (`DEBTOR_USER`)

**JWT Structure:**
```json
{
  "sub": "debtor-user-id",
  "userType": "DEBTOR_USER",
  "https://verichroninc.com/claims": {
    "organizationIds": ["org-A", "org-B", "org-C"],
    "debtorPermissions": ["debtor:self:read", "debtor:self:pay"],
    "isDebtor": true
  }
}
```

**Guard Behavior:**
- Can access multiple organizations provided in `organizationIds`.
- Permissions are self-scoped.

---

## Decision Tree for Context Extraction

```
Do you need different logic for different user types?
  YES → Use request.activeContext (Method 3)
  NO ↓

Is orgId in the URL path?
  YES → Use @Param('orgId') (Method 2)
  NO ↓

Use @OrganizationId() (Method 1) ← Default choice for single-org endpoints
```