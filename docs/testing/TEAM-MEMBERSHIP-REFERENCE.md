# Team Membership Reference

**Date:** 2025-12-23
**Status:** ✅ Updated with Bug Fix
**Purpose:** Quick reference for testing team-related features

---

## Stark Industries Teams

### Team Alpha
**Manager (Oversight):** happy.hogan@stark.com (Happy Hogan)
**Team Lead (Primary):** steve.rogers@stark.com (Steve Rogers)

**Members (Collectors):**
- natasha.romanoff@stark.com (Natasha Romanoff)
- clint.barton@stark.com (Clint Barton)
- sam.wilson@stark.com (Sam Wilson)

**Total Team Size:** 4 members (1 lead + 3 collectors)

---

### Team Beta
**Manager (Oversight):** nick.fury@stark.com (Nick Fury)
**Team Lead (Primary):** carol.danvers@stark.com (Carol Danvers)

**Members (Collectors):**
- wanda.maximoff@stark.com (Wanda Maximoff)
- scott.lang@stark.com (Scott Lang)

**Total Team Size:** 3 members (1 lead + 2 collectors)

---

## Wayne Enterprises Teams

### Team Alpha
**Manager (Oversight):** lucius.fox@wayne.com (Lucius Fox)
**Team Lead (Primary):** barbara.gordon@wayne.com (Barbara Gordon)

**Members (Collectors):**
- dick.grayson@wayne.com (Dick Grayson)
- tim.drake@wayne.com (Tim Drake)
- jason.todd@wayne.com (Jason Todd)

**Total Team Size:** 4 members (1 lead + 3 collectors)

---

### Team Beta
**Manager (Oversight):** lucius.fox@wayne.com (Lucius Fox)
**Team Lead (Primary):** barbara.gordon@wayne.com (Barbara Gordon)

**Members (Collectors):**
- _(No members assigned - Wayne has limited collectors)_

**Total Team Size:** 1 member (1 lead only)

---

## Testing Scenarios

### Scenario 1: Team Lead Viewing Their Team
**Login as:** steve.rogers@stark.com (Team Alpha Lead)

**Expected Behavior:**
- Sidebar shows "My Team" → Should navigate to Team Alpha dashboard
- Can see Team Alpha members: Natasha, Clint, Sam
- Can view team performance metrics
- Cannot see Team Beta (not their team)
- Cannot access org-wide "Teams" management

**Test:**
```
1. Login as steve.rogers@stark.com
2. Click "My Team" in sidebar
3. Verify you see:
   - Team Name: "Team Alpha"
   - Team Lead: Steve Rogers (you)
   - Members: Natasha Romanoff, Clint Barton, Sam Wilson
   - Team performance stats
4. Try accessing /manager/teams directly
   - Should either redirect to Team Alpha OR show only Team Alpha
```

---

### Scenario 2: Manager Viewing All Teams
**Login as:** happy.hogan@stark.com (Manager)

**Expected Behavior:**
- Sidebar shows "Teams" (plural) → Navigate to teams management
- Can see both Team Alpha and Team Beta
- Can view performance across all teams
- Can compare team metrics

**Test:**
```
1. Login as happy.hogan@stark.com
2. Click "Teams" in sidebar
3. Verify you see:
   - Team Alpha (managed by you)
   - Team Beta (managed by Nick Fury)
4. Click into each team to see members and metrics
```

---

### Scenario 3: Collector on Multiple Teams? (Edge Case)
**Note:** Currently collectors are assigned to only ONE team with `isPrimary = true/false`

**Login as:** natasha.romanoff@stark.com (Team Alpha Member)

**Expected Behavior:**
- No "My Team" in sidebar (collectors don't manage teams)
- Can see their own performance only
- Cannot access team management features

---

### Scenario 4: Team Lead with No Team Members
**Login as:** barbara.gordon@wayne.com (Team Alpha Lead)

**Expected Behavior:**
- Team Alpha shows 3 collectors: Dick, Tim, Jason
- Team Beta shows no collectors (Barbara is lead but no members assigned)
- Should still be able to access both teams she leads

---

## Team Hierarchy Explained

### Manager vs Team Lead

| Role | Responsibility | Access |
|------|---------------|---------|
| **Manager (ORG_MANAGER)** | Strategic oversight of multiple teams | Can view all teams, set goals, view analytics |
| **Team Lead (ORG_TEAM_LEAD)** | Day-to-day leadership of ONE team | Can view their primary team only |

**Key Difference:**
- Managers are assigned to teams via `team.manager_user_id` (NOT in team_members table)
- Team Leads are in `team_members` table with `role_on_team = 'LEAD'` and `is_primary = true`

---

## Database Structure

### Teams Table
```sql
id                 | UUID
organization_id    | UUID
name               | VARCHAR (Team Alpha, Team Beta)
description        | TEXT
manager_user_id    | UUID → References managers (Happy, Nick, Lucius)
created_at         | TIMESTAMP
updated_at         | TIMESTAMP
```

### Team Members Table
```sql
id            | UUID
team_id       | UUID → References teams
user_id       | UUID → References users (collectors and team leads)
role_on_team  | ENUM ('LEAD', 'MEMBER', 'MANAGER')
is_primary    | BOOLEAN (true for primary team assignment)
joined_at     | TIMESTAMP
```

---

## Quick Lookup: Who's on Which Team?

### Stark Industries

**Team Alpha Members:**
| Email | Name | Role |
|-------|------|------|
| steve.rogers@stark.com | Steve Rogers | Team Lead (PRIMARY) |
| natasha.romanoff@stark.com | Natasha Romanoff | Collector |
| clint.barton@stark.com | Clint Barton | Collector |
| sam.wilson@stark.com | Sam Wilson | Collector |

**Team Beta Members:**
| Email | Name | Role |
|-------|------|------|
| carol.danvers@stark.com | Carol Danvers | Team Lead (PRIMARY) |
| wanda.maximoff@stark.com | Wanda Maximoff | Collector |
| scott.lang@stark.com | Scott Lang | Collector |

---

### Wayne Enterprises

**Team Alpha Members:**
| Email | Name | Role |
|-------|------|------|
| barbara.gordon@wayne.com | Barbara Gordon | Team Lead (PRIMARY) |
| dick.grayson@wayne.com | Dick Grayson | Collector |
| tim.drake@wayne.com | Tim Drake | Collector |
| jason.todd@wayne.com | Jason Todd | Collector |

**Team Beta Members:**
| Email | Name | Role |
|-------|------|------|
| barbara.gordon@wayne.com | Barbara Gordon | Team Lead (PRIMARY) |
| _(no collectors)_ | | |

---

## Users NOT on Any Team

### Stark Industries
- ❌ tony.stark@stark.com (Admin - not assigned to teams)
- ❌ pepper.potts@stark.com (Viewer - not assigned to teams)

### Wayne Enterprises
- ❌ bruce.wayne@wayne.com (Admin - not assigned to teams)
- ❌ alfred.pennyworth@wayne.com (Viewer - not assigned to teams)

**Note:** Managers (Happy, Nick, Lucius) are NOT in `team_members` table. They're linked via `teams.manager_user_id`.

---

## Navigation Testing Checklist

### Team Lead Navigation
- [ ] **steve.rogers@stark.com** - Sidebar shows "My Team"
- [ ] Click "My Team" → Navigates to Team Alpha dashboard
- [ ] Shows 3 collectors (Natasha, Clint, Sam)
- [ ] Cannot access Team Beta

### Manager Navigation
- [ ] **happy.hogan@stark.com** - Sidebar shows "Teams" (plural)
- [ ] Click "Teams" → Shows both Team Alpha and Team Beta
- [ ] Can view all team members
- [ ] Can compare team performance

### Collector Navigation
- [ ] **natasha.romanoff@stark.com** - NO "My Team" in sidebar
- [ ] Can only see personal performance
- [ ] Cannot access team management features

---

## Common Issues to Test

### Issue 1: Team Lead Sees Wrong Team
**Symptom:** Steve Rogers sees Team Beta instead of Team Alpha

**Cause:** Route not detecting primary team membership

**Fix Required:** Route logic should query `team_members WHERE user_id = X AND is_primary = true`

---

### Issue 2: Manager Can't See All Teams
**Symptom:** Happy Hogan only sees Team Alpha

**Cause:** Route filtering by manager_user_id instead of showing all org teams

**Fix Required:** Managers should see ALL teams in their organization

---

### Issue 3: Team Lead Can See All Teams
**Symptom:** Steve Rogers can access Team Beta

**Cause:** Missing permission check or route guard

**Fix Required:** Team leads should only access their primary team

---

## Seeding Bug Fix Applied ✅

**Issue:** Original team seeding was missing collectors:
- Missing: wanda.maximoff, scott.lang, jason.todd, carol.danvers

**Fix:** Updated `teams.seed.ts` line 31-40 to include all collectors

**Affected Teams:**
- Team Beta (Stark) - Now properly has Wanda and Scott
- Team Alpha (Wayne) - Now properly has Jason

**Re-seed Required:** Yes, run `pnpm db:seed` again after this fix

---

## Password Reminder

All test users: **Password123!**

---

**Status:** Ready for Team Testing ✅
**Next Step:** Re-run seeding with bug fix, then test team navigation
