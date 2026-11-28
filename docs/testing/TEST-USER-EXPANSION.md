# Test User Expansion & Role Coverage

**Date:** 2025-12-23
**Status:** ✅ Implemented
**Purpose:** Increase test user diversity and enable testing of all role types for navigation reorganization

---

## Overview

Expanded test user seeding to include all role types (ORG_ADMIN, ORG_MANAGER, ORG_TEAM_LEAD, ORG_COLLECTOR, ORG_VIEWER) with diverse user profiles across both test organizations.

---

## Changes Made

### 1. Role Infrastructure Updates ✅

**File:** `e2e/seeding/core/org-roles.seed.ts`

Added missing role types to `OrgRolesResult`:
```typescript
export interface OrgRolesResult {
  orgAdmin: { id: string; name: string };
  orgManager: { id: string; name: string };
  orgTeamLead: { id: string; name: string };  // ✅ ADDED
  orgCollector: { id: string; name: string };
  orgViewer: { id: string; name: string };     // ✅ ADDED
  debtor: { id: string; name: string };
}
```

**File:** `e2e/seeding/test-data/org-users.seed.ts`

Updated `UserConfig` interface to support all role types:
```typescript
interface UserConfig {
  email: string;
  firstName: string;
  lastName: string;
  role: 'orgAdmin' | 'orgManager' | 'orgTeamLead' | 'orgCollector' | 'orgViewer' | 'orgUser';
}
```

---

### 2. Expanded Test Users ✅

#### Stark Industries (11 users - up from 4)

| Role | Email | Name | Purpose |
|------|-------|------|---------|
| **Admin** | tony.stark@stark.com | Tony Stark | Full system access testing |
| **Manager** | happy.hogan@stark.com | Happy Hogan | Strategic oversight testing |
| **Manager** | nick.fury@stark.com | Nick Fury | Multi-manager scenarios |
| **Team Lead** | steve.rogers@stark.com | Steve Rogers | Team Alpha lead testing |
| **Team Lead** | carol.danvers@stark.com | Carol Danvers | Team Beta lead testing |
| **Collector** | natasha.romanoff@stark.com | Natasha Romanoff | Collector workstation testing |
| **Collector** | clint.barton@stark.com | Clint Barton | Team Alpha member |
| **Collector** | sam.wilson@stark.com | Sam Wilson | Team Alpha member |
| **Collector** | wanda.maximoff@stark.com | Wanda Maximoff | Team Beta member |
| **Collector** | scott.lang@stark.com | Scott Lang | Team Beta member |
| **Viewer** | pepper.potts@stark.com | Pepper Potts | Read-only access testing |

#### Wayne Enterprises (7 users - up from 1)

| Role | Email | Name | Purpose |
|------|-------|------|---------|
| **Admin** | bruce.wayne@wayne.com | Bruce Wayne | Full system access testing |
| **Manager** | lucius.fox@wayne.com | Lucius Fox | Manager dashboard testing |
| **Team Lead** | barbara.gordon@wayne.com | Barbara Gordon | Team leadership testing |
| **Collector** | dick.grayson@wayne.com | Dick Grayson | Collector testing |
| **Collector** | tim.drake@wayne.com | Tim Drake | Team member testing |
| **Collector** | jason.todd@wayne.com | Jason Todd | Team member testing |
| **Viewer** | alfred.pennyworth@wayne.com | Alfred Pennyworth | Read-only testing |

**Total Users:** 18 (up from 5)

---

### 3. Team Structure Updates ✅

**File:** `e2e/seeding/test-data/teams.seed.ts`

Updated team assignments to reflect realistic team structures:

#### Team Alpha (Stark Industries)
- **Manager:** Happy Hogan (team oversight)
- **Team Lead:** Steve Rogers (day-to-day leadership, PRIMARY)
- **Members:**
  - Natasha Romanoff (collector)
  - Clint Barton (collector)
  - Sam Wilson (collector)

#### Team Beta (Stark Industries)
- **Manager:** Nick Fury (team oversight)
- **Team Lead:** Carol Danvers (day-to-day leadership, PRIMARY)
- **Members:**
  - Wanda Maximoff (collector)
  - Scott Lang (collector)

#### Team Alpha (Wayne Enterprises)
- **Manager:** Lucius Fox (team oversight)
- **Team Lead:** Barbara Gordon (day-to-day leadership, PRIMARY)
- **Members:**
  - Dick Grayson (collector)
  - Tim Drake (collector)
  - Jason Todd (collector)

---

## Role Testing Coverage

### All Role Types Now Testable

| Role | Test Users Available | Sidebar Items Expected |
|------|---------------------|----------------------|
| **ORG_ADMIN** | tony.stark@stark.com<br>bruce.wayne@wayne.com | 13 items (full access) |
| **ORG_MANAGER** | happy.hogan@stark.com<br>nick.fury@stark.com<br>lucius.fox@wayne.com | 10 items (strategic oversight) |
| **ORG_TEAM_LEAD** | steve.rogers@stark.com<br>carol.danvers@stark.com<br>barbara.gordon@wayne.com | 7 items (team management) |
| **ORG_COLLECTOR** | natasha.romanoff@stark.com<br>clint.barton@stark.com<br>sam.wilson@stark.com<br>wanda.maximoff@stark.com<br>scott.lang@stark.com<br>dick.grayson@wayne.com<br>tim.drake@wayne.com<br>jason.todd@wayne.com | 6 items (workstation focus) |
| **ORG_VIEWER** | pepper.potts@stark.com<br>alfred.pennyworth@wayne.com | Limited read-only access |

---

## Testing Scenarios Enabled

### Scenario 1: Manager Testing
**Login as:** happy.hogan@stark.com

**Expected Sidebar:**
```
✓ Dashboard
✓ Analytics
✓ Teams
✓ Goals
✓ Workflows
✓ Collectors
✓ Portfolios
✓ Debtors
✓ Debts
✓ Settings
```

**Test:**
- View Team Alpha dashboard
- Access collector leaderboards
- View goals and workflows

---

### Scenario 2: Team Lead Testing
**Login as:** steve.rogers@stark.com

**Expected Sidebar:**
```
✓ My Dashboard
✓ Work Queue
✓ My Performance
✓ My Team
✓ Debtors
✓ Debts
✓ Settings
```

**Test:**
- View personal performance
- Access Team Alpha (as lead)
- See team member list
- Cannot access org-wide analytics

---

### Scenario 3: Multi-Team Testing
**Login as:** happy.hogan@stark.com (Manager)

**Test:**
- View both Team Alpha and Team Beta
- Compare team performance
- Access both team dashboards

---

### Scenario 4: Read-Only Viewer Testing
**Login as:** pepper.potts@stark.com

**Test:**
- Can view debtors and debts (read-only)
- Cannot edit or create anything
- No access to workflows, teams, or analytics

---

## Seeding Instructions

### Run Complete Seeding
```bash
pnpm db:seed
```

This will:
1. Create all system permissions and platform roles
2. Create both test organizations (Stark Industries, Wayne Enterprises)
3. Create org-specific roles (including new ORG_TEAM_LEAD and ORG_VIEWER)
4. Create 18 diverse test users
5. Assign users to teams with proper team lead structure
6. Seed debtors, debts, transactions, and all related data

### Verify Seeding
After seeding completes, you should see:

```
Stark Industries (11 users):
  - Admin:         tony.stark@stark.com
  - Managers:      happy.hogan@stark.com, nick.fury@stark.com
  - Team Leads:    steve.rogers@stark.com, carol.danvers@stark.com
  - Collectors:    natasha.romanoff@stark.com, clint.barton@stark.com
                   sam.wilson@stark.com, wanda.maximoff@stark.com
                   scott.lang@stark.com
  - Viewer:        pepper.potts@stark.com

Wayne Enterprises (7 users):
  - Admin:         bruce.wayne@wayne.com
  - Manager:       lucius.fox@wayne.com
  - Team Lead:     barbara.gordon@wayne.com
  - Collectors:    dick.grayson@wayne.com, tim.drake@wayne.com
                   jason.todd@wayne.com
  - Viewer:        alfred.pennyworth@wayne.com
```

---

## Navigation Testing Checklist

### Phase 1 Navigation - Role-Based Sidebar Testing

- [ ] **ORG_ADMIN (bruce.wayne@wayne.com)**
  - [ ] See 13 sidebar items
  - [ ] Can access Users and Roles & Permissions
  - [ ] Dashboard adapts to admin view

- [ ] **ORG_MANAGER (happy.hogan@stark.com)**
  - [ ] See 10 sidebar items
  - [ ] Can access Teams, Goals, Workflows
  - [ ] Can access Collectors performance view
  - [ ] Cannot access Users or Roles & Permissions

- [ ] **ORG_TEAM_LEAD (steve.rogers@stark.com)**
  - [ ] See 7 sidebar items
  - [ ] "My Team" links to Team Alpha
  - [ ] "My Performance" shows personal stats
  - [ ] Can access Work Queue
  - [ ] Cannot access org-wide Analytics

- [ ] **ORG_COLLECTOR (natasha.romanoff@stark.com)**
  - [ ] See 6 sidebar items
  - [ ] "My Dashboard" is primary view
  - [ ] "My Performance" shows personal stats
  - [ ] Cannot access Teams, Analytics, or Workflows

- [ ] **ORG_VIEWER (pepper.potts@stark.com)**
  - [ ] Limited sidebar items
  - [ ] Can view Debtors and Debts (read-only)
  - [ ] Cannot access any management features

---

## Additional Benefits

### 1. Realistic Team Scenarios
- **Multi-team organization** (Stark has 2 teams, Wayne has 1)
- **Team lead hierarchy** (leads are primary team members)
- **Manager oversight** (managers assigned to teams but not primary members)

### 2. Performance Testing
- **More realistic data volume** (18 users instead of 5)
- **Multiple collectors** (8 total) generating metrics
- **Team-based analytics** testing with actual team membership

### 3. Permission Testing
- **Full RBAC coverage** (all 6 role types seeded)
- **Team-based permissions** (team leads can see their team only)
- **Read-only testing** (viewer role for compliance scenarios)

---

## Known Limitations

### Routes Not Yet Implemented
These sidebar items reference routes that don't exist yet:
- `/users` - User management (admin only)
- `/roles` - RBAC management (admin only)

**Phase 5** will implement these admin features.

### Team Context Detection
Team leads will see "My Team" link, but route logic needs update to:
- Detect user's primary team
- Redirect `/manager/teams` → `/teams/{primaryTeamId}` for team leads

**Phase 2** will address this in route consolidation.

---

## Migration Notes

### Backwards Compatibility ✅
- Existing test users (bruce.wayne, natasha.romanoff) **still work**
- Email addresses unchanged
- Password unchanged: `Password123!`

### Breaking Changes ❌
- None. All changes are additive.

---

## Next Steps

1. **Run Seeding:** `pnpm db:seed`
2. **Manual Testing:** Test all 5 role types for navigation
3. **Route Guards:** Verify unauthorized routes return 403
4. **Team Context:** Test team leads accessing "My Team"
5. **Analytics:** Verify manager dashboards show multi-team data

---

## Success Criteria

- [x] All 6 role types have test users
- [x] Both organizations have diverse teams
- [x] Team structure reflects realistic hierarchy
- [x] Seeding script updated and tested
- [ ] Navigation tested for all role types
- [ ] No console errors on login for any role
- [ ] Active route highlighting works for all users

---

## Files Modified

```
✓ e2e/seeding/core/org-roles.seed.ts
✓ e2e/seeding/test-data/org-users.seed.ts
✓ e2e/seeding/test-data/teams.seed.ts
✓ e2e/seeding/index.ts
```

---

## Related Documentation

- `NAVIGATION-REORGANIZATION-PHASE1.md` - Role-based sidebar implementation
- `ui-organization-audit.md` - Navigation analysis and strategy
- `apps/api-users/src/rbac/role-templates.ts` - Role permission definitions

---

**Status:** Ready for Testing ✅
**Seeding Command:** `pnpm db:seed`
