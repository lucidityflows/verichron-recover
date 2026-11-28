# API-Organizations MVP Gaps Verification

**Date**: 2025-11-27
**Status**: Verified gaps - distinguishing between code issues and documentation issues

---

## ✅ VERIFIED - These are DOCUMENTATION GAPS (code is correct)

### 1. PermissionsGuard Global Registration
- **Gap**: Documentation claims it's globally registered
- **Reality**: PermissionsGuard is NOT globally registered (app.module.ts line 103 confirms)
- **Fix**: Update documentation to clarify it's applied via `@UseGuards()` decorator
- **Files to update**:
  - `docs/developer-guide/guards.md`
  - `docs/rbac.md` (Authorization Flow Diagram)

### 2. OrgContextGuard DEBTOR Handling
- **Gap**: Documentation doesn't mention UserType.DEBTOR handling
- **Reality**: Code DOES handle DEBTOR (org-context.guard.ts lines 77-90)
- **Fix**: Update documentation to include DEBTOR handling
- **Files to update**:
  - `docs/developer-guide/guards.md` - "How it Works" section for OrgContextGuard

### 3. RoleGuard PlatformRoles Check
- **Gap**: Documentation claims it checks PlatformRoles
- **Reality**: Code ONLY checks activeContext.roles (organization-level), NOT platform roles
- **Fix**: Remove claim about PlatformRoles from documentation
- **Files to update**:
  - `docs/developer-guide/guards.md` - RoleGuard "How it Works" section

### 4. AuthContextTokenGuard Documentation
- **Gap**: Documentation includes section on AuthContextTokenGuard
- **Reality**: This guard does NOT exist in api-organizations (copied from api-users)
- **Fix**: Remove entire AuthContextTokenGuard section
- **Files to update**:
  - `docs/developer-guide/guards.md`

---

## ⚠️ VERIFIED - These are REAL CODE GAPS

### 5. PlatformAdminGuard Missing
- **Gap**: @PlatformRoles() decorator exists but no guard consumes it
- **Reality**:
  - `@PlatformRoles()` decorator defined in `src/core/decorators/role.decorator.ts:33`
  - NO PlatformAdminGuard implementation found
  - Documentation references PlatformAdminGuard but it doesn't exist
- **Impact**: Platform-level role authorization is not enforced
- **Fix Options**:
  - **Option A (Recommended)**: Create PlatformAdminGuard that checks platformRoles metadata
  - **Option B**: Remove @PlatformRoles() decorator if not needed for MVP
- **Decision needed**: Is platform-level role authorization required for MVP?

### 6. Event Listener Tests Missing
- **Gap**: No unit tests for event listeners
- **Reality**: 0 `*.listener.spec.ts` files found
- **Impact**: Event processing validation is untested
- **Fix**: Create unit tests for event listeners
- **Status**: Can defer if E2E tests cover event flows adequately

### 7. InvalidSettingsException Not Following Pattern
- **Gap**: Doesn't extend BaseException or set errorCode
- **Reality**: Extends BadRequestException directly (src/settings/errors.ts:3)
- **Impact**: Inconsistent error handling pattern
- **Fix**: Refactor to extend BaseException with errorCode 'ORGS_SETTINGS_001'
- **Priority**: Low (current implementation works, just inconsistent)

---

## 📋 RECOMMENDED ACTIONS

### Priority 1: Documentation Fixes (Quick Wins)
These are pure documentation issues - no code changes needed:

1. **Update guards.md**:
   - Remove "globally registered" claims for PermissionsGuard
   - Add DEBTOR handling to OrgContextGuard section
   - Remove PlatformRoles claim from RoleGuard section
   - Remove AuthContextTokenGuard section entirely

2. **Update rbac.md**:
   - Fix Authorization Flow diagram to show @UseGuards() usage
   - Clarify platform role checking mechanism

### Priority 2: PlatformAdminGuard Decision
**REQUIRES USER DECISION**:

**Question**: Do you need platform-level role authorization for MVP?

**Context**:
- Currently platform permissions use the Permissions decorator/guard
- Platform roles (@PlatformRoles decorator) have no enforcement
- Most platform operations already work via platform permissions

**Options**:
- **If YES**: Implement PlatformAdminGuard (simple guard, ~50 lines)
- **If NO**: Remove @PlatformRoles() decorator and update docs

### Priority 3: Event Listener Tests
**Can defer if**:
- E2E tests adequately cover event flows
- Event listeners are simple pass-through handlers
- No complex business logic in listeners

**Implement if**:
- Listeners have complex validation logic
- Need unit-level test coverage for compliance

### Priority 4: InvalidSettingsException Refactoring
**Lowest priority** - current implementation works, just not following established pattern.
Can be addressed during general error handling standardization pass.

---

## FILES TO UPDATE (Documentation Only)

1. `apps/api-organizations/docs/developer-guide/guards.md`
2. `apps/api-organizations/docs/developer-guide/decorators.md`
3. `apps/api-organizations/docs/rbac.md`
4. `apps/api-organizations/docs/testing-philosophy.md` (update test coverage table)
5. `apps/api-organizations/docs/developer-guide/error-codes.md` (update InvalidSettingsException section)
