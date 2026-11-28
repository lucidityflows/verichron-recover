# API Endpoint Research Findings - Team Overview Fix

**Date:** 2025-12-23
**Status:** ✅ Research Complete - Ready for Implementation
**Purpose:** Document existing internal API endpoints to determine best solution for org-wide collector fetching

---

## Research Objective

Investigate existing internal API endpoints to fix the team-overview orchestrator bug where it returns empty collectors when `teamId` is not provided (org-wide view for managers).

**User Guidance:** "i believe we designed the api with a route similar to what you, for this specific use case. the idea was to pass teamId or teamIds as a query param"

---

## Findings Summary

❌ **No endpoint exists that accepts teamId/teamIds as query parameters**
✅ **All team endpoints use path parameters only**
✅ **Solution: Use existing endpoints in combination**

---

## Existing Internal Endpoints Inventory

### 1. api-organizations - Teams Internal Controller

**File:** `apps/api-organizations/src/teams/teams-internal.controller.ts`

#### GET /internal/teams/:organizationId
- **Purpose:** Get all teams for an organization
- **Parameters:** organizationId (path param)
- **Returns:** `TeamResponseDto[]`
- **Use Case:** Discover all teams in an org

#### GET /internal/teams/:organizationId/user/:userId
- **Purpose:** Get teams a specific user belongs to
- **Parameters:** organizationId (path), userId (path)
- **Returns:** `TeamResponseDto[]`
- **Use Case:** Find user's team memberships

#### GET /internal/teams/:organizationId/:teamId/members
- **Purpose:** Get all members of a specific team
- **Parameters:** organizationId (path), teamId (path)
- **Returns:** `TeamMemberResponseDto[]`
- **Use Case:** Get team membership roster

**TeamMemberResponseDto Structure:**
```typescript
{
  teamId: string;
  userId: string;
  isPrimary: boolean;
  roleOnTeam: TeamMemberRole; // 'LEAD' | 'MEMBER' | 'MANAGER'
  joinedAt: string;
}
```

#### GET /internal/teams/verify-team-org/:organizationId/:teamId
- **Purpose:** Verify team belongs to organization
- **Parameters:** organizationId (path), teamId (path)
- **Returns:** `{ belongs: boolean }`

#### GET /internal/teams/verify-membership/:userId/:teamId
- **Purpose:** Verify user is team member
- **Parameters:** userId (path), teamId (path)
- **Returns:** `{ isMember: boolean }`

#### GET /internal/teams/user-primary-team/:organizationId/:userId
- **Purpose:** Get user's primary team
- **Parameters:** organizationId (path), userId (path)
- **Returns:** `{ primaryTeamId: string | null }`

**Key Observation:** All endpoints use **path parameters**. None accept teamId as a **query parameter**.

---

### 2. api-users - Users Internal Controller

**File:** `apps/api-users/src/internal/users-internal.controller.ts`

#### POST /internal/users/summaries
- **Purpose:** Batch fetch user profiles by IDs
- **Request Body:** `{ userIds: string[] }`
- **Returns:** `UserSummaryDto[]`
- **Use Case:** Get user details after discovering userIds

**Limitation:** Requires knowing userIds in advance (can't discover users by org/role)

---

### 3. api-collectors - Collectors Internal Controller

**File:** `apps/api-collectors/src/internal/collector-internal.controller.ts`

#### POST /internal/collectors/profiles
- **Purpose:** Batch fetch collector profiles
- **Request Body:** `{ collectorIds: string[] }`
- **Returns:** Collector profile data

#### POST /internal/collectors/workload
- **Purpose:** Get workload for collectors
- **Request Body:** `{ collectorIds: string[] }`

**Limitation:** All endpoints require collectorIds array (chicken-and-egg problem - we need to discover collectors first)

---

## Missing Endpoint (Does Not Exist)

### ❌ GET /internal/users/organization/:orgId/by-role
- **Expected:** Get all users with a specific role in an organization
- **Query Params:** `?roleName=ORG_COLLECTOR`
- **Status:** Does not exist in api-users

### ❌ GET /internal/teams/:organizationId/members?teamId=:teamId
- **Expected:** Get team members with optional teamId query param
- **Status:** Endpoint uses path params, not query params

---

## Proposed Solution Using Existing Endpoints

### Strategy: Multi-Step Query Pattern

Since no single endpoint exists to get all collectors in an organization, use existing endpoints in combination:

```typescript
// ORCHESTRATOR LOGIC FIX
async function getCollectorIdsForOrganization(organizationId: string, teamId?: string): Promise<string[]> {
  let collectorIds: string[];

  if (teamId) {
    // SINGLE TEAM VIEW (existing logic - works correctly)
    const members = await this.fetchInternal(
      orgsUrl,
      `/internal/teams/${organizationId}/${teamId}/members`
    );
    collectorIds = members.map((m: any) => m.userId);
  } else {
    // ORG-WIDE VIEW (FIXED LOGIC)
    // Step 1: Get all teams in organization
    const teams = await this.fetchInternal(
      orgsUrl,
      `/internal/teams/${organizationId}`
    );

    // Step 2: Get members from all teams
    const allMembers = [];
    for (const team of teams) {
      const members = await this.fetchInternal(
        orgsUrl,
        `/internal/teams/${organizationId}/${team.id}/members`
      );
      allMembers.push(...members);
    }

    // Step 3: Filter for collectors (MEMBER and LEAD roles)
    const collectors = allMembers.filter((m: any) =>
      m.roleOnTeam === 'MEMBER' || m.roleOnTeam === 'LEAD'
    );

    // Step 4: Deduplicate by userId (in case users are on multiple teams)
    const uniqueCollectorIds = [...new Set(collectors.map((m: any) => m.userId))];
    collectorIds = uniqueCollectorIds;
  }

  return collectorIds;
}
```

---

## Implementation Plan

### File to Modify
**Path:** `packages/event-orchestrator/src/orchestrators/collectors/managers-dashboard/analytics-team-overview.orchestrator.ts`

**Line:** 168-180 (current bug location)

### Changes Required

**BEFORE (Current - Broken):**
```typescript
let collectorIds: string[];
if (teamId) {
  const members = await this.fetchInternal(orgsUrl, `/internal/teams/${organizationId}/${teamId}/members`);
  collectorIds = members.map((m: any) => m.userId);
} else {
  // Fallback: Get all users with collector role in the organization
  collectorIds = [];  // ← BUG: Returns empty!
}

if (collectorIds.length === 0) {
  return this.sendResponse(replyTo, { organizationId, teamId, correlationId, overview: this.emptyOverview(organizationId, teamId) });
}
```

**AFTER (Fixed):**
```typescript
let collectorIds: string[];
if (teamId) {
  // SINGLE TEAM VIEW
  const members = await this.fetchInternal(orgsUrl, `/internal/teams/${organizationId}/${teamId}/members`);
  collectorIds = members.map((m: any) => m.userId);
} else {
  // ORG-WIDE VIEW - Get all collectors across all teams
  try {
    // Step 1: Get all teams in organization
    const teams = await this.fetchInternal(orgsUrl, `/internal/teams/${organizationId}`);

    // Step 2: Fetch members from all teams in parallel
    const memberPromises = teams.map((team: any) =>
      this.fetchInternal(orgsUrl, `/internal/teams/${organizationId}/${team.id}/members`)
    );
    const allMembersArrays = await Promise.all(memberPromises);

    // Step 3: Flatten and filter for collectors (MEMBER and LEAD roles)
    const allMembers = allMembersArrays.flat();
    const collectors = allMembers.filter((m: any) =>
      m.roleOnTeam === 'MEMBER' || m.roleOnTeam === 'LEAD'
    );

    // Step 4: Deduplicate by userId
    const uniqueCollectorIds = [...new Set(collectors.map((m: any) => m.userId))];
    collectorIds = uniqueCollectorIds;
  } catch (error) {
    this.logger.error('Failed to fetch org-wide collectors', error);
    collectorIds = [];
  }
}

if (collectorIds.length === 0) {
  this.logger.warn(`No collectors found for organization ${organizationId}, teamId: ${teamId || 'ALL'}`);
  return this.sendResponse(replyTo, { organizationId, teamId, correlationId, overview: this.emptyOverview(organizationId, teamId) });
}
```

---

## Performance Considerations

### Current Implementation (Single Team)
- **API Calls:** 1 (GET team members)
- **Latency:** ~50-100ms

### New Implementation (Org-Wide)
- **API Calls:** 1 + N (where N = number of teams)
  - Example: Stark Industries has 2 teams → 3 API calls total
  - Example: Large org with 10 teams → 11 API calls total
- **Latency:** ~100-500ms (depending on team count)
- **Optimization:** Using `Promise.all()` for parallel fetching

### Is This Acceptable?
✅ **Yes** - Managers don't call this endpoint frequently (dashboard load only)
✅ **Parallel fetching** minimizes latency impact
✅ **Event orchestrators** are designed for multi-service queries
✅ **Alternative** (new endpoint) would require backend changes

---

## Alternative Solutions Considered

### Option A: Create New Endpoint in api-users ❌
**Endpoint:** `GET /internal/users/organization/:orgId/by-role?roleName=ORG_COLLECTOR`

**Pros:**
- Single API call
- Clean, reusable endpoint
- Better performance

**Cons:**
- Requires backend changes in api-users
- Delays fix implementation
- api-users would need to query organization_users table
- Not directly team-aware (doesn't respect team structure)

**Decision:** Not needed - existing endpoints work

### Option B: Add Query Param to Existing Endpoint ❌
**Endpoint:** `GET /internal/teams/:organizationId/:teamId/members?includeAllTeams=true`

**Pros:**
- Single endpoint
- Backwards compatible

**Cons:**
- Awkward API design (teamId in path but ignored with query param)
- Requires backend changes
- Violates REST principles (path param should be required)

**Decision:** Not recommended

### Option C: Use Existing Endpoints (SELECTED) ✅
**Implementation:** Multi-step query as documented above

**Pros:**
- No backend changes required
- Uses existing, tested endpoints
- Respects team structure
- Handles deduplication correctly

**Cons:**
- Multiple API calls
- Slightly higher latency

**Decision:** Best option - implements fix immediately with existing infrastructure

---

## Testing Plan

### Test Case 1: Single Team View (Regression Test)
**Login as:** steve.rogers@stark.com (Team Lead)
**Action:** View Team Alpha dashboard
**Expected:**
- teamId is provided
- Uses existing logic (1 API call)
- Returns Team Alpha collectors: Natasha, Clint, Sam

### Test Case 2: Org-Wide View (Bug Fix Test)
**Login as:** happy.hogan@stark.com (Manager)
**Action:** View dashboard without team filter
**Expected:**
- teamId is undefined
- Uses new multi-step logic
- Returns ALL collectors from Team Alpha + Team Beta
- Expected collectors: Natasha, Clint, Sam, Wanda, Scott (5 collectors)

### Test Case 3: Empty Organization
**Setup:** Organization with no teams
**Expected:**
- Returns empty array gracefully
- No errors thrown
- Shows empty state in UI

### Test Case 4: User on Multiple Teams
**Setup:** Collector assigned to multiple teams (edge case)
**Expected:**
- Deduplication works correctly
- Collector appears only once in results

---

## Summary

### Research Conclusion
✅ **No existing endpoint accepts teamId as a query parameter**
✅ **All team endpoints use path parameters**
✅ **Solution: Use existing endpoints in combination (Option C)**

### Next Steps
1. ✅ Research complete (this document)
2. ⏳ Implement orchestrator fix using existing endpoints
3. ⏳ Test with managers (happy.hogan@stark.com)
4. ⏳ Verify collectors appear on dashboard

---

## Files Referenced

```
✓ apps/api-organizations/src/teams/teams-internal.controller.ts
✓ apps/api-organizations/src/teams/teams.service.ts
✓ apps/api-users/src/internal/users-internal.controller.ts
✓ apps/api-collectors/src/internal/collector-internal.controller.ts
✓ packages/event-orchestrator/src/orchestrators/collectors/managers-dashboard/analytics-team-overview.orchestrator.ts
```

---

**Status:** Ready to implement orchestrator fix
**Estimated Implementation Time:** 15 minutes
**Risk Level:** Low (uses existing, tested endpoints)
