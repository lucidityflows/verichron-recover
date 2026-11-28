# Manager/Admin Feature Set - Implementation Plan

## Vision
If our collectors have robust tools for their daily work, our managers need equally powerful tools to **lead, assign, monitor, and optimize** their teams. This plan brings the manager experience to the same high-quality standard as the collector experience.

---

## 🎯 Core Manager Responsibilities

Managers need to:
1. **Assign & Distribute Work** - Intelligently route accounts to collectors
2. **Set Expectations** - Define custom goals and KPIs for individuals and teams
3. **Monitor Performance** - Real-time visibility into team productivity
4. **Coach & Develop** - Identify strengths/weaknesses and provide guidance
5. **Ensure Compliance** - Monitor FDCPA violations and risk areas
6. **Optimize Strategy** - Analyze what's working and adjust tactics

---

## 📊 Phase 1: Team Management & Work Assignment (HIGH PRIORITY)

### 1.1 Team Overview Dashboard
**Route:** `/manager/team`

**Features:**
- **Team roster** with real-time status (active, idle, on break, offline)
- **Current workload** per collector (accounts assigned, in progress, completed)
- **Performance at-a-glance**: Today's contacts, promises, payments per collector
- **Capacity indicators**: Green (under capacity), Yellow (at capacity), Red (over capacity)
- **Quick actions**: Assign work, send message, view details

**UI Components:**
```
┌─────────────────────────────────────────────────┐
│ Team Overview           [+ Add Collector]        │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ Active Collectors: 8/12      Status: 🟢  │  │
│  │ Total Queue: 2,450 accounts             │  │
│  │ Today's Activity: 127 contacts          │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  Collector List:                                │
│  ┌────────────────────────────────────────┐   │
│  │ 🟢 Sarah Johnson        Active          │   │
│  │    42 accounts | 18 contacts today     │   │
│  │    [Assign] [View] [Message]           │   │
│  ├────────────────────────────────────────┤   │
│  │ 🟡 Mike Chen           At Capacity      │   │
│  │    68 accounts | 25 contacts today     │   │
│  │    [Assign] [View] [Message]           │   │
│  └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

### 1.2 Smart Work Assignment System
**Modal:** Work Assignment Wizard

**Assignment Strategies:**
1. **Load Balancing** - Distribute evenly based on current workload
2. **Skill-Based** - Route to collectors based on account type/complexity
3. **Geographic** - Assign by debtor location (time zones, regions)
4. **Performance-Based** - Give high-performers more challenging accounts
5. **Round-Robin** - Simple sequential distribution
6. **Custom Rules** - Manager-defined criteria

**UI Flow:**
```
Step 1: Select Accounts
  - Filter work queue
  - Select specific accounts
  - Or select by criteria (age, balance, priority)

Step 2: Choose Assignment Strategy
  - Radio buttons for strategies above
  - Show preview of distribution

Step 3: Review & Confirm
  - Table showing: Collector | Current Load | Will Receive | New Load
  - Confirm button

Step 4: Notification
  - Toast: "42 accounts assigned to 5 collectors"
  - Option to notify collectors
```

**Impact:** Reduces manager assignment time by 80%, ensures fair distribution

---

### 1.3 Custom Goal Setting Interface
**Route:** `/manager/goals`

**Features:**
- **Team-wide goals**: Apply to all collectors
- **Individual goals**: Customized per collector
- **Time periods**: Daily, Weekly, Monthly, Quarterly
- **Goal types**:
  - Contact-based (calls, emails, attempts)
  - Outcome-based (promises, payment plans, payments)
  - Financial ($ collected, $ in payment plans)
  - Efficiency (avg call duration, accounts per day)
- **Templates**: Pre-built goal sets (Aggressive, Moderate, Conservative)

**UI:**
```
┌─────────────────────────────────────────────────┐
│ Goal Management                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Team Goals:                                     │
│  ┌────────────────────────────────────────┐    │
│  │ Daily Contacts:  [50  ] per collector  │    │
│  │ Weekly Promises: [15  ] per collector  │    │
│  │ Monthly $:       [$2,500] per collector│    │
│  │                                         │    │
│  │ [Apply to All] [Load Template ▼]       │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  Individual Overrides:                           │
│  ┌────────────────────────────────────────┐    │
│  │ Sarah Johnson (Top Performer)           │    │
│  │   Daily Contacts:  [65] (30% above avg)│    │
│  │   Monthly $:       [$3,500]            │    │
│  │   [Save]                               │    │
│  └────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

**Impact:** Customized expectations drive better performance, clarity for collectors

---

## 📈 Phase 2: Performance Monitoring & Analytics

### 2.1 Real-Time Performance Dashboard
**Route:** `/manager/performance`

**Features:**
- **Live activity feed**: Who's calling whom, outcomes, in real-time
- **Team metrics**: Total contacts, promises, payments (today, this week, this month)
- **Individual leaderboards**: Top performers, most improved, needs attention
- **Velocity charts**: Contacts per hour, payment velocity
- **Compliance alerts**: FDCPA warnings, cease & desist triggers

**Visualizations:**
- Live activity timeline (like Twitter feed but for collections)
- Bar charts comparing collector performance
- Heatmap showing productive hours
- Gauge charts for goal attainment

---

### 2.2 Collector Comparison & Coaching Tools
**Route:** `/manager/coaching`

**Features:**
- **Side-by-side comparison**: Compare any 2 collectors across all metrics
- **Performance trends**: 30/60/90 day trends per collector
- **Strength/Weakness analysis**: Auto-identify what each collector excels at
- **Coaching recommendations**: AI-suggested areas for improvement
- **1-on-1 note tracking**: Store coaching session notes

**Example Analysis:**
```
Sarah vs Mike:
  Sarah:
    ✅ Higher contact rate (+25%)
    ✅ Better promise-to-pay conversion (+15%)
    ⚠️  Lower payment collection rate (-10%)

  Recommendation: Have Sarah shadow Mike on payment negotiation calls
```

---

### 2.3 Portfolio Health Analytics
**Route:** `/manager/portfolio-health`

**Features:**
- **Aging analysis**: 30/60/90/120+ day buckets
- **Risk indicators**: Accounts approaching statute of limitations
- **Compliance risk**: Accounts with disputes, cease & desist, bankruptcy
- **Recovery probability**: Predicted recovery rate per bucket
- **Recommended actions**: System suggestions for portfolio optimization

**Visualizations:**
- Stacked bar chart for aging
- Treemap for risk categories
- Line chart showing recovery trends

---

## 👥 Phase 3: Team Collaboration & Communication

### 3.1 Internal Messaging System
**Component:** Team Chat/Notes

**Features:**
- **Account-specific threads**: Discuss specific debtors
- **Team broadcasts**: Announcements to all collectors
- **Direct messages**: 1-on-1 communication
- **Mentions & notifications**: @mention to alert specific collectors
- **File attachments**: Share documents, scripts, resources

---

### 3.2 Shift Management & Scheduling
**Route:** `/manager/schedule`

**Features:**
- **Weekly schedule grid**: Visual calendar of who's working when
- **Time-off requests**: Collectors request PTO, managers approve
- **Shift swaps**: Enable collectors to trade shifts
- **Coverage alerts**: Warning when shifts are understaffed
- **Auto-assignment based on schedule**: Only assign to active collectors

---

## 🎓 Phase 4: Training & Development

### 4.1 Training Module Management
**Route:** `/manager/training`

**Features:**
- **Course library**: FDCPA training, negotiation tactics, software training
- **Assign training**: Send specific modules to collectors
- **Track completion**: See who's completed what, quiz scores
- **Certifications**: Track required certifications and expiration dates
- **Performance improvement plans**: Formal remediation workflows

---

### 4.2 Script & Template Management
**Route:** `/manager/scripts`

**Features:**
- **Call script library**: Opening scripts, objection handlers, closing scripts
- **Email templates**: Pre-approved email templates for various scenarios
- **Compliance-approved**: Mark templates as FDCPA compliant
- **Version control**: Track changes, see who last edited
- **Usage analytics**: Which templates are most effective

---

## ⚙️ Phase 5: Settings & Configuration

### 5.1 Organization Settings
**Route:** `/settings/organization`

**Features:**
- **Business rules**: Define collection policies
- **Compliance settings**: FDCPA requirements, state-specific rules
- **Payment methods**: Accepted payment types, gateway configuration
- **Communication preferences**: Allowed contact times, frequency limits
- **Escalation rules**: When to escalate to legal, when to write off

---

### 5.2 User Management
**Route:** `/settings/users`

**Features:**
- **Invite collectors**: Email invitations with role assignment
- **Role management**: Define permissions (Collector, Manager, Admin)
- **Deactivate users**: Offboard collectors, archive their data
- **Audit logs**: Track who did what, when
- **Bulk operations**: Add multiple users via CSV import

---

## 🔧 Technical Implementation

### Data Models Needed:
```typescript
// Team Goal
interface TeamGoal {
  id: string;
  organizationId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  goalType: 'contacts' | 'promises' | 'payments' | 'collections';
  target: number;
  unit: string;
  appliesToAllCollectors: boolean;
  overrides: Array<{
    collectorId: string;
    target: number;
  }>;
}

// Work Assignment
interface WorkAssignment {
  id: string;
  assignedBy: string; // Manager ID
  assignedTo: string; // Collector ID
  accountIds: string[];
  assignmentDate: Date;
  strategy: 'load-balance' | 'skill-based' | 'geographic' | 'performance' | 'round-robin';
  notes?: string;
}

// Coaching Note
interface CoachingNote {
  id: string;
  managerId: string;
  collectorId: string;
  date: Date;
  topic: string;
  notes: string;
  actionItems: string[];
  followUpDate?: Date;
}
```

### API Endpoints Needed:
```typescript
// Team Management
GET    /api/v1/orgs/:orgId/team/collectors
POST   /api/v1/orgs/:orgId/team/assign-work
GET    /api/v1/orgs/:orgId/team/performance

// Goals
GET    /api/v1/orgs/:orgId/goals
POST   /api/v1/orgs/:orgId/goals
PUT    /api/v1/orgs/:orgId/goals/:goalId
DELETE /api/v1/orgs/:orgId/goals/:goalId

// Coaching
GET    /api/v1/orgs/:orgId/coaching/notes
POST   /api/v1/orgs/:orgId/coaching/notes
GET    /api/v1/orgs/:orgId/coaching/compare/:collector1/:collector2

// Analytics
GET    /api/v1/orgs/:orgId/analytics/team-performance
GET    /api/v1/orgs/:orgId/analytics/portfolio-health
GET    /api/v1/orgs/:orgId/analytics/compliance-alerts
```

---

## 📋 Implementation Priority

### Tier 1 (CRITICAL - Do First):
1. **Team Overview Dashboard** - Managers need to see their team
2. **Smart Work Assignment** - Core workflow for managers
3. **Custom Goal Setting** - Set expectations immediately

### Tier 2 (HIGH VALUE):
4. **Real-Time Performance Dashboard** - Monitor team activity
5. **Portfolio Health Analytics** - Understand account risk
6. **Collector Comparison** - Coaching and development

### Tier 3 (ENHANCING):
7. **Messaging System** - Team collaboration
8. **Script/Template Management** - Standardize communication
9. **Training Module** - Long-term development

---

## 🎨 Design Principles

1. **Information Density**: Managers need to see more data at once - use tables, grids, charts
2. **Action-Oriented**: Every metric should have a related action button
3. **Drill-Down**: High-level overview → click for details → click for individual account
4. **Real-Time Updates**: Use WebSockets or polling for live data (where applicable)
5. **Export Everything**: Every view should have CSV/PDF export option

---

## 💡 Key Differentiators

What makes this manager experience **high-value**:

1. **Intelligent Assignment**: Not just "assign 50 accounts", but smart routing based on strategy
2. **Customizable Goals**: Not one-size-fits-all, but tailored to each collector's capabilities
3. **Proactive Alerts**: System tells managers when intervention is needed
4. **Coaching Intelligence**: Data-driven recommendations for development
5. **Compliance Automation**: Catch violations before they become problems

---

## Next Steps

1. Review this plan with you
2. Prioritize which Phase 1 features to build first
3. Design mockups for key screens
4. Implement in iterative sprints (like we did for collector features)

**Estimated Total Time:** 60-80 hours for complete implementation
**Phase 1 Time:** 20-25 hours (Team Management & Work Assignment)

---

This plan matches the quality and depth of the collector experience we've built. Managers will have powerful, intuitive tools to lead their teams effectively.
