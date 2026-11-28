# UI User Experience Redesign

**Document Version:** 1.0
**Last Updated:** 2024-12-24
**Status:** Design Specification

---

## Executive Summary

This document defines the user experience strategy for the ui-organizations application. We are transitioning from exploratory development to deliberate, user-centered design. Each user role has distinct needs, workflows, and decision-making contexts that must be reflected in their interface.

**Core Design Principles:**
1. **Actionable Over Informational** - Show data only when users can act on it
2. **Responsive Flexibility** - Support multi-window workflows with graceful resizing
3. **Role-Based Relevance** - Each user sees only what matters to their scope
4. **Professional Polish** - Sophisticated, modern, consistent visual design
5. **Performance First** - Fast load times, real-time updates where meaningful

---

## User Role Definitions

### ORG_ADMIN
**Who They Are:** Organization owners, IT administrators, system configurators
**Primary Responsibility:** System configuration, security, compliance oversight
**Time Horizon:** Strategic (weeks to months)
**Key Metric:** System health, user adoption, security posture

**What They Want:**
- Full visibility into organization configuration
- User access control and audit logs
- Integration management (API keys, webhooks)
- System performance metrics

**What They Need:**
- Quick access to security alerts
- Ability to add/remove users and assign roles
- Portfolio and team structure management
- Settings and configuration controls

**What They Might Not Know They Need:**
- Proactive compliance monitoring dashboards
- User activity patterns (who's not logging in?)
- System usage analytics (which features are unused?)
- Bulk operations for user/team management

---

### ORG_MANAGER
**Who They Are:** Collection managers, operations directors, team supervisors
**Primary Responsibility:** Team performance, goal achievement, resource allocation
**Time Horizon:** Tactical (days to weeks)
**Key Metric:** Collection rate, team productivity, goal completion

**What They Want:**
- Real-time team performance visibility
- Ability to reassign work and balance workloads
- Goal tracking and progress monitoring
- Quick identification of problems requiring intervention

**What They Need:**
- At-a-glance performance dashboard
- Leaderboards showing top/bottom performers
- Work queue management tools
- Team composition and assignment controls

**What They Might Not Know They Need:**
- Predictive alerts (goals at risk, collectors over capacity)
- Trend analysis (performance degradation patterns)
- Coaching opportunity identification
- Automated workflow suggestions based on patterns

---

### ORG_TEAM_LEAD
**Who They Are:** Senior collectors, shift supervisors, pod leaders
**Primary Responsibility:** Direct team coaching, task assignment, day-to-day coordination
**Time Horizon:** Immediate (hours to days)
**Key Metric:** Team output today/this week, individual member growth

**What They Want:**
- Visibility into their team members' current status
- Ability to help struggling team members
- Quick reassignment within their team
- Recognition of team achievements

**What They Need:**
- Team-scoped work queue
- Individual performance cards for each team member
- Coaching notes and intervention tracking
- Team goal progress vs individual contributions

**What They Might Not Know They Need:**
- Real-time "help needed" signals from collectors
- Side-by-side performance comparisons
- Skills gap identification per team member
- Escalation paths for issues beyond their scope

---

### ORG_COLLECTOR
**Who They Are:** Front-line collection agents, account specialists
**Primary Responsibility:** Contact debtors, secure payments, resolve accounts
**Time Horizon:** Immediate (minutes to hours)
**Key Metric:** Accounts contacted today, payments secured, personal goals

**What They Want:**
- Clear prioritized work list
- Quick access to debtor information
- Easy way to log actions
- Visibility into personal performance

**What They Need:**
- Distraction-free work queue
- Contact tools (phone, email, SMS)
- Action history and notes
- Personal goal tracking

**What They Might Not Know They Need:**
- Contextual guidance (best time to call, suggested messaging)
- Gamification and achievement recognition
- Learning resources based on performance gaps
- Workload visibility (time to complete queue)

---

### ORG_VIEWER
**Who They Are:** Stakeholders, auditors, read-only observers
**Primary Responsibility:** Monitoring, reporting, compliance verification
**Time Horizon:** Variable (depends on stakeholder type)
**Key Metric:** N/A (no direct accountability)

**What They Want:**
- Access to reports and dashboards
- Ability to export data
- Historical trend visibility

**What They Need:**
- Read-only dashboard access
- Report generation tools
- Data export functionality

**What They Might Not Know They Need:**
- Scheduled report delivery
- Custom dashboard views
- Anomaly highlighting

---

## Route Architecture & Page Specifications

### ORG_ADMIN Routes

#### `/` - Admin Command Center
**Purpose:** System health monitoring and quick access to admin functions
**Does:**
- Shows system-wide KPIs (total users, active teams, compliance status)
- Displays security alerts and failed login attempts
- Provides quick actions (Add User, Configure Integration, View Logs)
- Shows recent admin activity (who changed what)

**Doesn't:**
- Show collection performance (not their focus)
- Allow direct debtor/debt management
- Display individual collector stats

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Admin Command Center                    [Settings]  │
├─────────────────────────────────────────────────────┤
│ [System Health] [Active Users] [Compliance] [API]   │ ← 4-col stats grid
├─────────────────────────────────────────────────────┤
│ Security Alerts (if any)                            │ ← Conditional banner
├─────────────────────────────────────────────────────┤
│ Quick Actions: [Add User] [Manage Teams] [Settings] │
├─────────────────────────────────────────────────────┤
│ Recent Admin Activity          │  Integration Status│ ← 2-col grid
│ • User added: John Doe         │  ✓ API Connected   │
│ • Team created: East Coast     │  ✓ Webhooks Active │
└─────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- 4-col stats → 2-col (tablet) → 1-col (mobile)
- 2-col grid → 1-col stack on mobile
- Quick actions wrap into 2 rows if needed
- All cards maintain minimum 280px width

---

#### `/users` - User Management
**Purpose:** Add, edit, remove users; manage roles and permissions
**Does:**
- Lists all organization users in DataTable
- Provides bulk role assignment
- Shows last login, status (active/inactive)
- Allows user creation with role selection

**Doesn't:**
- Show performance metrics (use /teams or /collectors for that)
- Allow editing user's personal goals
- Display debtor access history

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ User Management                 [+ Add User] [Export]│
├─────────────────────────────────────────────────────┤
│ Filters: [Role] [Status] [Team] [Search...]         │
├─────────────────────────────────────────────────────┤
│ DataTable:                                          │
│ ☑ Name          Email         Role      Last Login  │
│ □ John Doe      j@ex.com      Manager   2 hrs ago   │
│ □ Jane Smith    jane@ex.com   Collector 5 mins ago  │
└─────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- Table scrolls horizontally on mobile
- Filters collapse into dropdown menu on mobile
- Bulk actions appear as floating action button on mobile

---

#### `/roles` - Role & Permission Management
**Purpose:** Configure role permissions and capabilities
**Does:**
- Shows permission matrix (role × capability)
- Allows creating custom roles
- Displays role hierarchy

**Doesn't:**
- Assign roles to users (do that in /users)
- Show who has each role (informational only)

---

#### `/settings` - Organization Settings
**Purpose:** Configure org-wide settings, integrations, billing
**Does:**
- Manages organization profile (name, timezone, currency)
- Configures integrations (APIs, webhooks, third-party services)
- Sets default workflows and automation rules
- Manages subscription and billing

**Doesn't:**
- Configure individual user preferences
- Manage debtor/debt data structure (that's in /portfolios)

---

### ORG_MANAGER Routes

#### `/` - Manager Dashboard
**Purpose:** Real-time team performance monitoring and quick problem identification
**Does:**
- Shows today's collection metrics (with trends vs yesterday)
- Displays live activity feed (last 50 actions across team)
- Shows current leaderboard (top 5 performers today)
- Alerts managers to problems (compliance alerts, goals at risk)
- Provides quick actions (Assign Work, Set Goal, View Reports)

**Doesn't:**
- Show individual account details (use /debtors for that)
- Allow editing workflows (use /workflows)
- Display historical trends (use /analytics for that)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Manager Dashboard               [Team: All ▾] [↻]   │
├─────────────────────────────────────────────────────┤
│ [Collections] [Contacts] [Promises] [Active Team]   │ ← 4-col stats (with trends)
├─────────────────────────────────────────────────────┤
│ ⚠ 3 Compliance Alerts Require Attention             │ ← Conditional banner
├─────────────────────────────────────────────────────┤
│ Quick Actions: [Assign Work] [Set Goal] [Reports]   │
├─────────────────────────────────────────────────────┤
│ Live Activity Feed             │ Leaderboard (Today)│ ← 2-col grid (60/40 split)
│ 5s ago: Sarah - Payment $500   │ 🥇 Sarah - $12.3K  │
│ 12s ago: John - Called debtor  │ 🥈 Mike - $8.9K    │
│ 45s ago: Mike - Sent email     │ 🥉 Lisa - $7.1K    │
├─────────────────────────────────────────────────────┤
│ Team Goals Progress                                 │
│ [Progress Ring: 67%] 4 of 6 goals on track          │
│ ⚠ At Risk: Weekly Revenue (behind 15%)              │
└─────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- 4-col stats → 2-col (tablet) → 1-col (mobile)
- 2-col grid stacks vertically on tablet
- Live activity shows last 10 (instead of 50) on mobile
- Leaderboard collapses to top 3 on mobile
- All text truncates with ellipsis, never wraps awkwardly
- Cards maintain 16:9 aspect ratio, scale proportionally

---

#### `/teams` - Team Management
**Purpose:** Create, edit, manage team structure and membership
**Does:**
- Lists all teams with member counts
- Allows creating teams and assigning members
- Shows team hierarchy (if nested teams exist)
- Provides member role assignment (MEMBER, LEAD)

**Doesn't:**
- Show team performance metrics (use / or /analytics)
- Allow direct work assignment (use /work-queue)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Teams                                  [+ New Team]  │
├─────────────────────────────────────────────────────┤
│ Team Name        Members    Lead           Actions  │
│ East Coast       12         Sarah Jones    [Edit]   │
│ West Coast       8          Mike Chen      [Edit]   │
│ All Collectors   24         (Unassigned)   [View]   │
└─────────────────────────────────────────────────────┘
```

---

#### `/teams/:teamId` - Team Detail
**Purpose:** View and manage specific team membership and settings
**Does:**
- Shows team info (name, description, lead)
- Lists team members with roles
- Allows adding/removing members
- Shows team-specific goals

**Doesn't:**
- Show real-time activity (use / dashboard)
- Display individual performance (use /collectors/:id)

---

#### `/goals` - Goal Management
**Purpose:** Set, track, and manage performance goals
**Does:**
- Lists all active goals (team and individual)
- Shows progress for each goal (current vs target)
- Allows creating new goals with target/period selection
- Highlights goals at risk or achieved

**Doesn't:**
- Show historical goal trends (use /analytics)
- Display collector activity (shows progress only)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Performance Goals                   [+ New Goal]     │
├─────────────────────────────────────────────────────┤
│ Team Goals                         [+ Add Team Goal] │
│ ┌────────────────────────────────────────────────┐  │
│ │ Weekly Revenue        [Progress: 67%] ⚠ At Risk│  │
│ │ Target: $50K | Current: $33.5K | 2 days left   │  │
│ └────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────┐  │
│ │ Daily Contacts        [Progress: 112%] ✓ Ahead │  │
│ │ Target: 200 | Current: 224 | Resets tomorrow   │  │
│ └────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ Individual Goals                                    │
│ ┌────────────────┬────────────────┬───────────────┐ │
│ │ Sarah - Revenue│ Mike - Contacts│ Lisa - Revenue│ │
│ │ [85%] On Track │ [45%] Behind   │ [100%] Done ✓ │ │
│ └────────────────┴────────────────┴───────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- Individual goal cards: 3-col → 2-col (tablet) → 1-col (mobile)
- Progress bars maintain minimum 200px width
- Card grids use CSS Grid with `minmax(280px, 1fr)`

---

#### `/workflows` - Workflow Automation
**Purpose:** Configure automated assignment, escalation, and notification rules
**Does:**
- Shows active workflow rules
- Allows creating automation rules (if → then)
- Displays execution history
- Provides rule templates

**Doesn't:**
- Execute workflows manually (they're automatic)
- Show real-time execution (use history tab)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Workflow Automation                                 │
├─────────────────────────────────────────────────────┤
│ [Rules] [Auto-Assignment] [Escalation] [History]    │ ← Tab navigation
├─────────────────────────────────────────────────────┤
│ Active Rules (3)                   [+ Create Rule]  │
│ ┌────────────────────────────────────────────────┐  │
│ │ ✓ High Balance Auto-Escalate          [Edit]   │  │
│ │   When: Balance > $10K                         │  │
│ │   Then: Escalate to Manager                    │  │
│ │   Status: Active | Last Run: 2 mins ago        │  │
│ └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

#### `/collectors/:collectorId` - Collector Detail
**Purpose:** Deep-dive into individual collector performance and activity
**Does:**
- Shows collector profile and stats
- Displays performance timeline (daily trend)
- Shows goal progress for this collector
- Lists recent activity and accounts assigned
- Allows viewing/adding coaching notes

**Doesn't:**
- Allow editing collector profile (admin function)
- Show debtor details (focused on collector performance)

---

#### `/work-queue` - Work Queue Management
**Purpose:** View and manage account assignments across team
**Does:**
- Shows all pending accounts
- Allows bulk assignment/reassignment
- Provides filtering by priority, balance, age
- Supports exporting queue to CSV

**Doesn't:**
- Show account details (click through to /debtors/:id)
- Allow payment processing (that's in debtor focus view)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Work Queue                    [Assign] [Export CSV]  │
├─────────────────────────────────────────────────────┤
│ [All] [Urgent] [New] [Payment Plans] [Search...]    │ ← Quick filters
├─────────────────────────────────────────────────────┤
│ 247 Accounts | $1.2M Total Balance                  │
├─────────────────────────────────────────────────────┤
│ ☑ Priority | Debtor Name    | Balance  | Assigned   │
│ □ 🔴 URGENT | John Smith    | $12,340  | Unassigned │
│ □ 🟠 HIGH   | Jane Doe      | $8,900   | Sarah J.   │
│ □ 🔵 MEDIUM | Bob Johnson   | $5,600   | Mike C.    │
└─────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- Table scrolls horizontally on mobile with sticky checkbox column
- Filters collapse into "Filter" dropdown on mobile
- Bulk actions become floating button when items selected

---

#### `/analytics/performance` - Performance Analytics
**Purpose:** Historical trends and strategic portfolio analysis
**Does:**
- Shows portfolio performance metrics (recovery rate, ROI)
- Displays trend charts (week-over-week, month-over-month)
- Provides comparison views (team vs team, period vs period)
- Supports date range selection

**Doesn't:**
- Show real-time activity (use / dashboard)
- Allow editing portfolios (read-only analysis)

---

#### `/debtors` - Debtor List
**Purpose:** Search and access debtor accounts
**Does:**
- Lists all debtors with search/filter
- Shows key info (balance, status, last contact)
- Allows clicking through to debtor focus view

**Doesn't:**
- Show full account history (click through for that)
- Allow bulk operations (focused on search/access)

---

#### `/settings` - Manager Settings
**Purpose:** Personal preferences and team defaults
**Does:**
- Manages notification preferences
- Sets dashboard default team filter
- Configures report schedule

**Doesn't:**
- Allow org-wide settings (admin function)
- Manage user accounts

---

### ORG_TEAM_LEAD Routes

#### `/` - Team Lead Dashboard
**Purpose:** Monitor and coach direct team members throughout the day
**Does:**
- Shows team-filtered today's stats
- Displays team member status cards (online, on break, offline)
- Shows team work queue (accounts assigned to team members)
- Highlights coaching opportunities (members needing help)
- Displays team goal progress

**Doesn't:**
- Show org-wide metrics (scoped to team only)
- Allow reassignment outside team
- Display historical analytics (focused on today)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ My Team: East Coast                                 │
├─────────────────────────────────────────────────────┤
│ [Team Collections] [Team Contacts] [Team Members]   │ ← 3-col stats (team-scoped)
├─────────────────────────────────────────────────────┤
│ Team Members (8)                                    │
│ ┌──────────┬──────────┬──────────┬──────────┐      │
│ │🟢 Sarah  │🟡 Mike   │🟢 Lisa   │🔴 John   │      │ ← 4-col grid
│ │$4.2K     │On Break  │$3.1K     │0 contacts│      │
│ │12 calls  │─         │8 calls   │⚠ Help?   │      │
│ └──────────┴──────────┴──────────┴──────────┘      │
├─────────────────────────────────────────────────────┤
│ Team Work Queue            │ Team Goals             │ ← 2-col grid
│ 34 accounts pending        │ [Progress: 78%]        │
│ [View Queue] [Reassign]    │ Weekly Revenue: $38K   │
│                            │ Target: $50K           │
├─────────────────────────────────────────────────────┤
│ Coaching Opportunities                              │
│ ⚠ John - No contacts today (avg: 15/day)            │
│ ⚠ Mike - Behind on revenue goal (60%, 3 days left)  │
└─────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- 4-col member grid → 2-col (tablet) → 1-col (mobile)
- Member cards maintain square aspect ratio
- 2-col grid stacks on mobile
- Stats abbreviate on small screens ($4.2K instead of $4,200)

---

#### `/work-queue` - Team Work Queue
**Purpose:** Manage work assignments within team
**Does:**
- Shows accounts assigned to team members only
- Allows reassignment within team
- Provides same filtering as manager view

**Doesn't:**
- Show org-wide queue
- Allow assignment to other teams

---

#### `/goals` - Team Goals
**Purpose:** Track team and individual member goals
**Does:**
- Shows team-scoped goals
- Displays individual goals for team members
- Allows creating goals for team members

**Doesn't:**
- Show org-wide goals
- Allow editing other teams' goals

---

#### `/collectors/:collectorId` - Team Member Detail
**Purpose:** View team member performance and add coaching notes
**Does:**
- Shows same view as manager, filtered to team member
- Allows adding coaching notes
- Shows performance trends

**Doesn't:**
- Allow editing collector profile
- Show collectors from other teams

---

#### `/teams/:teamId` - My Team Detail
**Purpose:** View and manage own team membership
**Does:**
- Shows team info (read-only for team name/description)
- Lists team members
- Allows requesting member additions (if permitted)

**Doesn't:**
- Allow editing team name/description (manager function)
- Show other teams

---

### ORG_COLLECTOR Routes

#### `/` - Collector Dashboard
**Purpose:** Personal performance tracking and daily motivation
**Does:**
- Shows personal today's stats (calls, emails, collected)
- Displays daily goal progress with visual feedback
- Shows this week's activity summary
- Displays today's schedule (next 5 follow-ups)
- Shows team leaderboard position

**Doesn't:**
- Show other collectors' detailed stats
- Allow editing goals (view progress only)
- Display admin/manager tools

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ My Dashboard                          [Work Queue]   │
├─────────────────────────────────────────────────────┤
│ [Calls Made] [Emails Sent] [Contacted] [Collected]  │ ← 4-col stats
├─────────────────────────────────────────────────────┤
│ Daily Goals                                         │
│ ┌────────────────────────────────────────────────┐  │
│ │ [Progress Ring: 67%] 2 of 3 goals complete     │  │
│ │ ✓ 25 Calls (Target: 20) | ✓ $2K (Target: $1.5K)│ │
│ │ ⏳ 15 Contacts (Target: 25) - 10 more to go!    │  │
│ └────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ This Week                  │ Today's Schedule       │ ← 2-col grid (60/40)
│ Total Calls: 124           │ 🕐 9:30 - John Smith   │
│ Accounts Resolved: 8       │ 🕑 10:15 - Jane Doe    │
│ Total Collected: $12.3K    │ 🕒 11:00 - Bob Johnson │
│ Recovery Rate: 42%         │ ... 12 more today      │
│                            │ [View Full Queue]      │
├─────────────────────────────────────────────────────┤
│ Team Leaderboard - This Month                       │
│ 🥇 Sarah - $45K | 🥈 Mike - $38K | 🥉 You - $33K    │
│ Your rank: #3 out of 8 collectors                   │
└─────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- 4-col stats → 2-col (tablet) → 1-col (mobile)
- Daily goals card maintains readability, abbreviates text on mobile
- 2-col grid stacks on mobile
- Schedule shows next 3 (instead of 5) on mobile
- Leaderboard shows top 3 only on all screen sizes
- Text uses `clamp()` for fluid typography (min 14px, max 18px)

---

#### `/work-queue` - My Work Queue
**Purpose:** Distraction-free prioritized work list
**Does:**
- Shows accounts assigned to me only
- Sorts by priority automatically
- Provides simple filtering (All, Urgent, Follow-ups)
- Allows clicking through to debtor focus view

**Doesn't:**
- Show unassigned accounts
- Allow bulk reassignment (can defer only)
- Display advanced filters by default

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ My Work Queue                    [Simple Mode: ON]   │ ← Toggle for power users
├─────────────────────────────────────────────────────┤
│ [All] [Urgent] [Follow-ups] [Payment Plans]         │ ← Quick filters only
├─────────────────────────────────────────────────────┤
│ 23 Accounts in Queue                                │
├─────────────────────────────────────────────────────┤
│ 🔴 URGENT | John Smith | $12,340 | Call Now         │ ← Priority color bar
│ [📞 Call] [✉ Email] [Start Working]                 │
├─────────────────────────────────────────────────────┤
│ 🟠 HIGH | Jane Doe | $8,900 | Payment Due Today     │
│ [📞 Call] [✉ Email] [Start Working]                 │
├─────────────────────────────────────────────────────┤
│ 🔵 MEDIUM | Bob Johnson | $5,600 | Follow-up Call   │
│ [📞 Call] [✉ Email] [Start Working]                 │
└─────────────────────────────────────────────────────┘
```

**Simple Mode (Default):**
- Clean list view with priority indicator
- Quick action buttons only
- No bulk selection, no advanced filters
- Click debtor name → focus view

**Power User Mode (Toggle On):**
- Adds bulk selection checkboxes
- Shows advanced filters (balance range, days overdue)
- Adds predictive analytics row (likelihood to pay)
- Shows export option

**Responsive Behavior:**
- Cards stack vertically (always 1-col)
- Quick action buttons: 3 visible → 2 visible + "More" menu on mobile
- Priority bar maintains 4px width on all screens
- Text truncates with ellipsis if debtor name > 30 chars

---

#### `/debtors/:debtorId/focus` - Debtor Focus View
**Purpose:** Single account workspace for contacting and resolving debts
**Does:**
- Shows debtor contact info and balance
- Provides action buttons (Call, Email, SMS, Log Payment)
- Displays interaction timeline
- Shows account flags (dispute, payment plan)
- Allows logging notes and actions

**Doesn't:**
- Show other accounts (focused on one)
- Allow reassignment (collector can defer only)
- Display collector performance

---

#### `/goals` - My Goals
**Purpose:** View personal goal progress and celebrate achievements
**Does:**
- Shows active personal goals
- Displays progress with visual feedback
- Shows achievement history (past goals completed)

**Doesn't:**
- Show team goals (unless opted in)
- Allow creating goals (manager-assigned)

---

#### `/settings` - Collector Settings
**Purpose:** Personal preferences
**Does:**
- Manages notification preferences
- Sets work queue default filter
- Configures dashboard goal visibility

**Doesn't:**
- Allow team/org settings

---

### ORG_VIEWER Routes

#### `/` - Viewer Dashboard
**Purpose:** Read-only monitoring and reporting access
**Does:**
- Shows org-wide KPIs (collections, accounts, teams)
- Displays high-level trends
- Provides export functionality

**Doesn't:**
- Allow any editing or assignments
- Show real-time activity (static snapshots)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Organization Overview                    [Export]    │
├─────────────────────────────────────────────────────┤
│ [Total Collections] [Active Accounts] [Team Count]  │ ← 3-col stats
├─────────────────────────────────────────────────────┤
│ Performance Trends (Last 30 Days)                   │
│ [Line chart showing daily collection totals]        │
├─────────────────────────────────────────────────────┤
│ Reports                                             │
│ [Generate Monthly Report] [Export Team Data]        │
└─────────────────────────────────────────────────────┘
```

---

#### `/analytics/*` - All Analytics Pages
**Purpose:** Read-only access to analytics
**Does:**
- Shows same charts as managers
- Allows exporting data

**Doesn't:**
- Allow editing anything

---

## Design Standards

### Responsive Breakpoints

```css
/* Mobile First Approach */
--mobile: 0-767px      /* 1-col layouts, stacked cards */
--tablet: 768-1023px   /* 2-col layouts, condensed spacing */
--desktop: 1024-1439px /* 3-4 col layouts, full features */
--wide: 1440px+        /* Max 4-col, generous spacing */
```

### Grid System Rules

**Stats Cards (4-column grid):**
```css
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem; /* 24px */
}

/* Ensures cards shrink proportionally */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem; /* 16px */
  }
}
```

**Text Truncation:**
```css
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Multi-line truncation */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

**Fluid Typography:**
```css
/* Scale text between breakpoints */
.heading-xl {
  font-size: clamp(1.75rem, 2vw + 1rem, 2.25rem); /* 28-36px */
}

.heading-lg {
  font-size: clamp(1.25rem, 1.5vw + 0.75rem, 1.75rem); /* 20-28px */
}

.body {
  font-size: clamp(0.875rem, 0.5vw + 0.75rem, 1rem); /* 14-16px */
}
```

### Component Specifications

#### StatsCard
**Minimum Width:** 280px
**Aspect Ratio:** 16:9 preferred, flexible height
**Content Structure:**
- Icon (24x24px) + Title (truncate at 20 chars)
- Value (clamp 24-32px, bold)
- Trend (optional, 12-14px, truncate at 30 chars)

**Responsive Rules:**
- Icon shrinks to 20x20px on mobile
- Value maintains minimum 24px size
- Padding: 24px desktop → 16px mobile

#### DataTable
**Minimum Column Width:** 120px
**Horizontal Scroll:** Enabled on mobile with sticky first column
**Row Height:** 56px (comfortable click target)
**Content Overflow:** Truncate with ellipsis, show full text on hover (tooltip)

#### Modal
**Max Width:** 600px (forms), 900px (data views)
**Mobile Behavior:** Full screen on <768px
**Close Button:** Always visible, 44x44px tap target

### Color & Visual Hierarchy

**Priority Colors (Consistent Across App):**
```css
--priority-urgent: #DC2626;   /* Red */
--priority-high: #EA580C;     /* Orange */
--priority-medium: #3B82F6;   /* Blue */
--priority-low: #6B7280;      /* Gray */
```

**Status Colors:**
```css
--success: #10B981;  /* Green */
--warning: #F59E0B;  /* Amber */
--error: #EF4444;    /* Red */
--info: #3B82F6;     /* Blue */
```

**Spacing Scale:**
```css
--space-xs: 0.25rem;  /* 4px */
--space-sm: 0.5rem;   /* 8px */
--space-md: 1rem;     /* 16px */
--space-lg: 1.5rem;   /* 24px */
--space-xl: 2rem;     /* 32px */
--space-2xl: 3rem;    /* 48px */
```

### Animation & Interaction

**Animation Duration:**
- Micro-interactions: 150ms (hover, click)
- Component transitions: 300ms (modal open, page change)
- Data updates: 500ms (chart animations)

**Stagger Delays:**
```css
/* For sequential card animations */
.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 100ms; }
.card:nth-child(3) { animation-delay: 200ms; }
.card:nth-child(4) { animation-delay: 300ms; }
```

**Hover States:**
- Background color shift (10% opacity change)
- Scale: 1.02 for cards, 1.05 for buttons
- Transition: 150ms ease-in-out

### Performance Requirements

**Page Load:**
- Initial render: <1 second
- Time to interactive: <2 seconds
- Skeleton screens for >500ms loads

**Real-time Updates:**
- Live activity feed: 5-10 second polling
- Stats refresh: 30-60 second polling
- No polling on inactive tabs (Page Visibility API)

**Data Refresh:**
- Use React Query staleTime/cacheTime
- Optimistic updates for mutations
- Background refetch on window focus

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Define responsive breakpoints in CSS variables
- [ ] Create base component library (StatsCard, DataTable, Modal)
- [ ] Implement fluid typography system
- [ ] Set up grid layout templates
- [ ] Add truncation utilities

### Phase 2: Manager Experience (Week 3-4)
- [ ] Redesign Manager Dashboard with LiveActivityFeed
- [ ] Add TeamGoalsProgress component
- [ ] Implement responsive stats grid
- [ ] Test multi-window resizing behavior
- [ ] Polish animations and transitions

### Phase 3: Team Lead Experience (Week 5)
- [ ] Create Team Lead Dashboard
- [ ] Build TeamMembersGrid component
- [ ] Implement CoachingOpportunities panel
- [ ] Route Team Leads to dedicated page

### Phase 4: Collector Experience (Week 6)
- [ ] Implement Simple Mode toggle on Work Queue
- [ ] Optimize Collector Dashboard for single-task focus
- [ ] Add "Start My Day" auto-pilot feature
- [ ] Test mobile responsiveness

### Phase 5: Admin & Polish (Week 7-8)
- [ ] Build Admin Command Center
- [ ] Implement Viewer read-only views
- [ ] Add keyboard shortcuts
- [ ] Conduct accessibility audit (ARIA labels, keyboard nav)
- [ ] Performance optimization pass
- [ ] Cross-browser testing

---

## Success Metrics

**Quantitative:**
- Page load time <1s (Lighthouse score >90)
- Zero horizontal scroll on mobile
- Zero text overflow/cutoff bugs
- 100% WCAG 2.1 AA compliance

**Qualitative (User Feedback):**
- "Sophisticated and professional" - 80%+ agree
- "Easy to find what I need" - 85%+ agree
- "Works well on multiple screens" - 90%+ agree
- "Faster than our old system" - 75%+ agree

---

## Appendix: Page Access Matrix

| Page Route                  | ADMIN | MANAGER | TEAM_LEAD | COLLECTOR | VIEWER |
|-----------------------------|-------|---------|-----------|-----------|--------|
| `/` (Dashboard)             | ✓*    | ✓       | ✓**       | ✓***      | ✓****  |
| `/users`                    | ✓     | ✗       | ✗         | ✗         | ✗      |
| `/roles`                    | ✓     | ✗       | ✗         | ✗         | ✗      |
| `/teams`                    | ✓     | ✓       | ✓ (own)   | ✗         | ✗      |
| `/teams/:teamId`            | ✓     | ✓       | ✓ (own)   | ✗         | ✗      |
| `/goals`                    | ✓     | ✓       | ✓ (team)  | ✓ (own)   | ✗      |
| `/workflows`                | ✓     | ✓       | ✗         | ✗         | ✗      |
| `/work-queue`               | ✓     | ✓       | ✓ (team)  | ✓ (own)   | ✗      |
| `/collectors/:collectorId`  | ✓     | ✓       | ✓ (team)  | ✓ (own)   | ✓      |
| `/debtors`                  | ✓     | ✓       | ✓         | ✓         | ✓      |
| `/debtors/:debtorId/focus`  | ✓     | ✓       | ✓         | ✓         | ✓      |
| `/analytics/*`              | ✓     | ✓       | ✗         | ✗         | ✓      |
| `/settings`                 | ✓**** | ✓       | ✓         | ✓         | ✗      |

*Admin sees "Admin Command Center"
**Team Lead sees "Team Lead Dashboard"
***Collector sees "Collector Dashboard"
****Viewer sees "Organization Overview"
*****Admin sees org-wide settings, others see personal preferences

---

**Document Status:** Ready for Implementation
**Next Step:** Phase 1 implementation - Create base component library with responsive grid system
