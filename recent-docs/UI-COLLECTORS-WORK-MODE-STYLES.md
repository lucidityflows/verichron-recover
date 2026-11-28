# UI-Collectors Work Mode Styles

**Document Version:** 1.0
**Created:** January 18, 2026
**Last Updated:** January 19, 2026
**Status:** Implementation In Progress (Phase 1 & 2 Complete)
**Target Users:** Debt Collectors (Agents), Team Leads, Agency Owners

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Issues](#2-current-issues)
3. [Goals](#3-goals)
4. [The Solution: Work Mode Styles](#4-the-solution-work-mode-styles)
5. [The Break Room Concept](#5-the-break-room-concept)
6. [Why This Will Work](#6-why-this-will-work)
7. [Technical Requirements](#7-technical-requirements)
8. [UI/UX Specifications](#8-uiux-specifications)
9. [Implementation Phases](#9-implementation-phases)
10. [Success Metrics](#10-success-metrics)
11. [Open Questions & Decisions](#11-open-questions--decisions)
12. [Progress Tracking](#12-progress-tracking)

---

## 1. Executive Summary

### The Problem
Our initial work queue design showed all prioritized items and allowed collectors to manually select any account. This defeats the purpose of a "smart" prioritized queue and raises fundamental questions about session management, real-time updates, and the distinction between queue view and focus state.

### The Solution
Introduce **two distinct work modes** that collectors choose per-session, empowering them to work according to their strengths and the nature of their portfolio:

| Mode | Philosophy | Control |
|------|------------|---------|
| **Flow State** | "Keep me in the zone" | System-led, auto-connect |
| **Strategy Mode** | "Let me plan my approach" | Collector-led, manual dial |

### The Innovation
Instead of forcing managers to pick a dialer mode for the entire organization (industry standard), we let **collectors choose their work style per-session**. This is humane software design that respects collector autonomy while maintaining system intelligence.

---

## 2. Current Issues

### 2.1 Work Queue Presentation Problem

**Current State:** The SmartPlaylist component displays all work queue items in a prioritized list, allowing collectors to:
- See their entire queue (50+ items)
- Click any item to work it
- Skip high-priority items for "easier" accounts

**Why This Is Problematic:**
1. **Cherry-picking** - Collectors avoid difficult conversations
2. **Decision fatigue** - Too many choices slow down work
3. **Undermines AI** - Prioritization algorithm is ignored
4. **Queue anxiety** - Seeing 50 items is demoralizing

### 2.2 Unclear State Distinction

**Question:** If the queue is a "smart playlist" where items appear/disappear dynamically, what makes the Focus State different from the Queue?

**Current Confusion:**
- Queue = List of all available work
- Focus = One account with full context
- But: Both allow the same actions, just different data density

### 2.3 Missing Session Context

**Current State:** No concept of "work session" or "work mode"
- Collector navigates freely between routes
- No intentionality about how they want to work
- System doesn't adapt to collector preferences

### 2.4 Industry Research Findings

Research into debt collection software (FICO, Latitude, MeridianLink, Collect!) revealed:

| Dialer Type | Description | Use Case |
|-------------|-------------|----------|
| **Predictive** | System auto-dials multiple lines, connects live calls | High-volume, simple accounts |
| **Preview** | Collector reviews account, manually initiates | Complex accounts, relationships |
| **Progressive** | Brief preview (5-10s), then auto-dial | Balanced approach |

**Key Insight:** The industry forces organizations to choose one mode. We can differentiate by offering collector-level choice.

**Sources:**
- [CallTools: Preview vs Predictive](https://calltools.com/blog/choosing-between-a-predictive-dialer-or-preview-dialer/)
- [McKinsey: Account Ownership Teams](https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/the-seven-pillars-of-collections-wisdom)
- [Credgenics: Dialer Choice](https://www.credgenics.com/dialer-for-debt-collections)

---

## 3. Goals

### 3.1 Primary Goals

| Goal | Description | Success Indicator |
|------|-------------|-------------------|
| **Empower Collectors** | Let them choose how they work best | Mode selection per session |
| **Reduce Decision Fatigue** | Limit visible choices | Max 3 priorities in Strategy Mode |
| **Maintain Flow** | System-assisted rhythm | Auto-connect in Flow State |
| **Premium Experience** | Not cramped, not aggressive | Generous whitespace, card-based UI |
| **Collector Happiness** | System helps, not a nemesis | Positive user feedback |

### 3.2 Target Customer Profile

| Attribute | Value |
|-----------|-------|
| **Agency Size** | 5-20 collectors |
| **Team Structure** | Small teams (3-7 per lead) or flat |
| **Account Types** | Mixed complexity (medical, utility, credit) |
| **Work Style** | Relationship-focused, not pure volume |
| **Values** | Collector judgment, debtor relationships |

### 3.3 Non-Goals (Explicitly Out of Scope)

- **Aggressive auto-dialer** - We are not building a high-volume predictive dialer
- **Manager-enforced modes** - Collectors choose, not managers
- **Gamification pressure** - No leaderboards that shame underperformers
- **Surveillance feel** - Time tracking exists but isn't punitive

---

## 4. The Solution: Work Mode Styles

### 4.1 Flow State Mode

**Philosophy:** "I trust the system. Keep me moving."

**Target Collector:**
- Wants to stay in rhythm
- Working simpler accounts
- Morning energy, high productivity periods
- New collectors learning the rhythm

**User Experience:**

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                           FLOW STATE                                 │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │                      CONNECTING IN 0:45                        │  │
│  │                      ══════════════════                        │  │
│  │                          [Progress Bar]                        │  │
│  │                                                                │  │
│  │                       JOHN SMITH                               │  │
│  │                       $4,500 · Medical                         │  │
│  │                                                                │  │
│  │   ┌─────────────────────────────────────────────────────────┐  │  │
│  │   │ WHY NOW:                                                │  │  │
│  │   │ • Broke promise to pay 3 days ago ($200)                │  │  │
│  │   │ • Has made 2 payments in the past                       │  │  │
│  │   │ • Best time to call: Morning (historical pattern)       │  │  │
│  │   └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │          [Skip This One]              [Connect Now]            │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  UP NEXT: Jane Doe ($2,100) · Bob Wilson ($8,200)                    │
│                                                                      │
│                                          [Return to Break Room]      │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
1. **Countdown Timer** - 30-60 seconds to review before auto-connect
2. **"Why Now" Card** - System explains its prioritization reasoning
3. **Minimal Info** - Just what's needed to prepare
4. **Skip Option** - Limited skips per hour (anti-gaming)
5. **Connect Now** - Impatient? Start the call early
6. **Up Next Preview** - See next 2 accounts (no interaction)

**Workflow:**
1. Collector enters Flow State from Break Room
2. System presents first account with 45-second countdown
3. Collector reviews "Why Now" context
4. Timer completes → Twilio auto-dials
5. Call connects or fails (voicemail, no answer, etc.)
6. Disposition panel appears
7. Collector logs outcome
8. System auto-advances to next account
9. Repeat until collector exits to Break Room

### 4.2 Strategy Mode

**Philosophy:** "Let me plan my approach."

**Target Collector:**
- Experienced, uses judgment
- Working complex/high-value accounts
- Wants to research before calling
- End of day, careful work

**User Experience:**

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  YOUR TOP PRIORITIES                                    Strategy Mode│
│                                                                      │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐│
│  │                    │ │                    │ │                    ││
│  │   JOHN SMITH       │ │   JANE DOE         │ │   BOB WILSON       ││
│  │   $4,500           │ │   $2,100           │ │   $8,200           ││
│  │                    │ │                    │ │                    ││
│  │   Medical          │ │   Utility          │ │   Credit Card      ││
│  │   120 days overdue │ │   45 days overdue  │ │   60 days overdue  ││
│  │                    │ │                    │ │                    ││
│  │   WHY NOW:         │ │   WHY NOW:         │ │   WHY NOW:         ││
│  │   Broken PTP       │ │   No contact 2wks  │ │   High balance     ││
│  │                    │ │                    │ │                    ││
│  │   [Review →]       │ │   [Review →]       │ │   [Review →]       ││
│  └────────────────────┘ └────────────────────┘ └────────────────────┘│
│                                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  Also in your queue (42 more)                          [View All →]  │
│                                                                      │
│                                          [Return to Break Room]      │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
1. **Top 3 Priorities** - Card-based, not a cramped list
2. **"Why Now" Reasoning** - Each card explains priority
3. **Review Action** - Opens full Workbench/Focus view
4. **View All Option** - Access full queue if needed (collapsed by default)
5. **Manual Dial** - Collector initiates call when ready
6. **Script Notes** - Add personal notes to call script before dialing

**Workbench Enhancements for Strategy Mode:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  JOHN SMITH                                              $4,500 OWED │
│  Medical · 120 days · Primary Collector: You                         │
│                                                                      │
│  ┌─────────────────────────────────────────┐ ┌────────────────────┐  │
│  │ CALL SCRIPT                             │ │ YOUR NOTES         │  │
│  │                                         │ │                    │  │
│  │ "Good morning, this is [Name] calling   │ │ [Editable area]    │  │
│  │ regarding your account with [Creditor]. │ │                    │  │
│  │ I see you made a promise to pay $200    │ │ • Ask about job    │  │
│  │ on January 15th..."                     │ │ • Mentioned kids   │  │
│  │                                         │ │ • Prefers PM calls │  │
│  │ OBJECTION HANDLERS:                     │ │                    │  │
│  │ • "I already paid" → Check records      │ │                    │  │
│  │ • "Can't afford" → Payment plan option  │ │                    │  │
│  │                                         │ │                    │  │
│  └─────────────────────────────────────────┘ └────────────────────┘  │
│                                                                      │
│  [◀ Back to Priorities]        [Call Now]        [Schedule Later]    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Workflow:**
1. Collector enters Strategy Mode from Break Room
2. Views Top 3 Priorities cards
3. Clicks "Review" on chosen account
4. Workbench opens with full context
5. Collector adds notes to script (optional)
6. Clicks "Call Now" when ready
7. Twilio initiates call
8. Disposition panel appears after call
9. Collector logs outcome
10. Returns to Top 3 Priorities (refreshed)
11. Repeat until collector exits to Break Room

---

## 5. The Break Room Concept

### 5.1 Philosophy

The "Break Room" is the collector's home base - a calm space to:
- Start their shift
- Choose how they want to work
- Take a mental break between sessions
- Check their performance
- Access team lead functions (if applicable)

**It is NOT:**
- A dashboard with overwhelming metrics
- A place where work follows them
- Anxiety-inducing

### 5.2 Visual Design

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                        Good morning, Sarah                           │
│                                                                      │
│                    ┌─────────────────────────┐                       │
│                    │     TODAY'S SNAPSHOT    │                       │
│                    │                         │                       │
│                    │   12 accounts worked    │                       │
│                    │   $2,400 collected      │                       │
│                    │   68% to daily goal     │                       │
│                    │                         │                       │
│                    └─────────────────────────┘                       │
│                                                                      │
│         How would you like to work?                                  │
│                                                                      │
│    ┌─────────────────┐          ┌─────────────────┐                  │
│    │                 │          │                 │                  │
│    │   FLOW STATE    │          │  STRATEGY MODE  │                  │
│    │                 │          │                 │                  │
│    │   System-led    │          │  Collector-led  │                  │
│    │   Auto-connect  │          │  Manual dial    │                  │
│    │   Stay in zone  │          │  Plan approach  │                  │
│    │                 │          │                 │                  │
│    │   42 accounts   │          │  Top 3 shown    │                  │
│    │   ready         │          │  42 total       │                  │
│    │                 │          │                 │                  │
│    │   [Enter →]     │          │   [Enter →]     │                  │
│    └─────────────────┘          └─────────────────┘                  │
│                                                                      │
│    ┌─────────────────┐          ┌─────────────────┐                  │
│    │                 │          │                 │                  │
│    │   PERFORMANCE   │          │   FLOOR VIEW    │  ← Team Lead     │
│    │                 │          │                 │     Only         │
│    │   View stats    │          │   Monitor team  │                  │
│    │   Track goals   │          │   Approvals     │                  │
│    │                 │          │                 │                  │
│    │   [View →]      │          │   [View →]      │                  │
│    └─────────────────┘          └─────────────────┘                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 Break Room Features

| Feature | Description |
|---------|-------------|
| **Greeting** | Personalized with time of day |
| **Today's Snapshot** | Simple metrics (not overwhelming) |
| **Mode Cards** | Clear choice between work styles |
| **Queue Count** | Shows available accounts |
| **Performance Access** | Check detailed stats when wanted |
| **Floor View** | Team Lead only, manage team |

### 5.4 Navigation Flow

```
                         ┌─────────────┐
                         │ Break Room  │
                         │  (Landing)  │
                         └──────┬──────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
    │ Flow State  │      │  Strategy   │      │ Performance │
    │             │      │    Mode     │      │             │
    └──────┬──────┘      └──────┬──────┘      └─────────────┘
           │                    │
           │              ┌─────┴─────┐
           │              │           │
           ▼              ▼           ▼
    ┌─────────────┐ ┌─────────┐ ┌─────────────┐
    │  Auto-Call  │ │ Top 3   │ │  Workbench  │
    │  + Preview  │ │ Cards   │ │  (Review)   │
    └──────┬──────┘ └────┬────┘ └──────┬──────┘
           │             │             │
           └─────────────┴─────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ Disposition │
                  │   Panel     │
                  └──────┬──────┘
                         │
                         ▼
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
     [Auto-advance]          [Return to Mode]
     (Flow State)            (Strategy Mode)
```

---

## 6. Why This Will Work

### 6.1 Psychology of Collector Empowerment

| Traditional Approach | Our Approach |
|---------------------|--------------|
| Manager picks dialer mode for all | Collector picks their style |
| System controls everything | System assists, collector leads |
| One size fits all | Adapt to individual strengths |
| "You must call these" | "Here's what we recommend" |

**Research Support:**
- Autonomy increases job satisfaction (Self-Determination Theory)
- Choice reduces resistance to tasks
- Personalization increases tool adoption

### 6.2 Target Customer Alignment

Our target: **5-20 collector agencies**

| What They Value | How We Deliver |
|-----------------|----------------|
| Collector expertise | Strategy Mode respects judgment |
| Relationship building | Sticky collector assignment |
| Flexibility | Two work modes |
| Not "big enterprise feel" | Premium, calm UI |
| Staff retention | Tools that don't feel oppressive |

### 6.3 Competitive Differentiation

| Competitor Approach | Verichron Approach |
|--------------------|--------------|
| Force org to pick predictive OR preview | Collector chooses per-session |
| Cramped, data-dense UI | Premium, whitespace-rich |
| Aggressive auto-dialer | "Flow State" with preview time |
| Surveillance-focused | Empowerment-focused |

### 6.4 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Collectors always pick Strategy (avoiding calls) | Track mode usage, gentle prompts |
| Too many skips in Flow State | Skip limits per hour |
| Mode switching avoids work | Mode is per-session, not per-account |
| Complexity of two UIs | Shared components, clear separation |

---

## 7. Technical Requirements

### 7.1 Data Model Changes

#### 7.1.1 User Preferences (Zustand Store)
```typescript
interface CollectorPreferences {
  // Work mode preferences
  lastUsedMode: 'FLOW_STATE' | 'STRATEGY_MODE' | null;
  flowStateCountdownSeconds: number; // Default: 45

  // Flow State settings
  flowStateSkipsRemaining: number;
  flowStateSkipsResetAt: Date;

  // Strategy Mode settings
  strategyModeShowAllQueue: boolean; // Default: false

  // Session tracking
  currentSessionId: string | null;
  currentSessionMode: 'FLOW_STATE' | 'STRATEGY_MODE' | null;
  sessionStartedAt: Date | null;
}
```

#### 7.1.2 Work Queue Item Enhancements
```typescript
interface WorkQueueItemEnhanced extends WorkQueueItem {
  // "Why Now" reasoning
  priorityReasons: string[]; // Array of human-readable reasons

  // Strategy Mode notes
  collectorDraftNotes?: string; // Ephemeral, not persisted to backend
}
```

#### 7.1.3 Session State (Backend - Optional for MVP)
```typescript
interface CollectorSession {
  id: string;
  collectorUserId: string;
  organizationId: string;
  mode: 'FLOW_STATE' | 'STRATEGY_MODE';
  startedAt: Date;
  endedAt: Date | null;
  accountsWorked: number;
  skipsUsed: number; // Flow State only
}
```

### 7.2 API Requirements

#### 7.2.1 Existing Endpoints (No Changes)
- `GET /work-queues` - Already returns prioritized queue
- `GET /workstation/debtors/:id/focus` - Already returns full debtor context
- `POST /workstation/debtors/:id/actions` - Already logs actions

#### 7.2.2 New/Enhanced Endpoints

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `GET /work-queues/top-priorities` | GET | Return top 3 with "Why Now" | MVP |
| `PATCH /work-queues/:id/skip` | PATCH | Skip item with cooldown | MVP |
| `POST /collectors/sessions` | POST | Start work session | Post-MVP |
| `PATCH /collectors/sessions/:id/end` | PATCH | End work session | Post-MVP |

#### 7.2.3 "Why Now" Reasoning Logic

The `priorityReasons` array should be generated based on:
```typescript
function generatePriorityReasons(item: WorkQueueItem): string[] {
  const reasons: string[] = [];

  // Priority-based reasons
  if (item.priorityLabel === 'URGENT') {
    reasons.push('Flagged as urgent by system');
  }

  // PTP-related
  if (item.tags.includes('broken-ptp')) {
    reasons.push('Broke promise to pay recently');
  }

  // Time-based
  if (item.daysOverdue > 90) {
    reasons.push(`${item.daysOverdue} days overdue - aging account`);
  }

  // Contact-based
  if (item.lastContactDate) {
    const daysSinceContact = daysSince(item.lastContactDate);
    if (daysSinceContact > 14) {
      reasons.push(`No contact in ${daysSinceContact} days`);
    }
  }

  // Balance-based
  if (item.totalBalance > 5000) {
    reasons.push('High balance account');
  }

  // Payment history
  if (item.tags.includes('has-payment-history')) {
    reasons.push('Has made payments before');
  }

  return reasons.slice(0, 3); // Max 3 reasons
}
```

### 7.3 WebSocket Requirements

#### 7.3.1 Events to Subscribe

| Event | Purpose | Mode |
|-------|---------|------|
| `queue:item-assigned` | New item added to queue | Both |
| `queue:item-removed` | Item removed (completed elsewhere) | Both |
| `queue:priority-changed` | Priorities recalculated | Both |
| `call:connected` | Twilio call connected | Flow State |
| `call:ended` | Twilio call ended | Flow State |

#### 7.3.2 Events to Emit

| Event | Purpose | Mode |
|-------|---------|------|
| `collector:mode-changed` | Notify team lead of mode | Both |
| `collector:working-account` | Currently focused account | Both |
| `collector:skipped-account` | Account skipped (with reason) | Flow State |

### 7.4 Twilio Integration Requirements

#### 7.4.1 Flow State Auto-Connect
```typescript
async function initiateFlowStateCall(debtorId: string): Promise<void> {
  // 1. Get Twilio token (already implemented)
  const token = await voiceService.generateSoftphoneToken();

  // 2. Initialize Twilio Device (new)
  const device = new Device(token);
  await device.register();

  // 3. Get debtor's phone number
  const debtor = await debtorFocusService.getFocus(debtorId);
  const phoneNumber = debtor.phone?.phoneNumber;

  // 4. Initiate call
  const call = await device.connect({
    params: { To: phoneNumber, DebtorId: debtorId }
  });

  // 5. Handle call events
  call.on('accept', () => { /* Call connected */ });
  call.on('disconnect', () => { /* Show disposition panel */ });
  call.on('error', (error) => { /* Handle error, skip to next */ });
}
```

#### 7.4.2 Strategy Mode Manual Dial
```typescript
async function initiateStrategyCall(debtorId: string): Promise<void> {
  // Same as above, but triggered by button click, not timer
}
```

---

## 8. UI/UX Specifications

### 8.1 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Generous Whitespace** | 40px+ padding on cards, 24px between elements |
| **Large Typography** | Balance: 32px, Names: 24px, Body: 16px |
| **Card-Based** | No tables, no cramped rows |
| **Soft Colors** | Muted palette, no aggressive red/yellow/green |
| **Limited Choices** | Max 3 priorities visible, expand for more |
| **Clear CTAs** | One primary action per view |

### 8.2 Color Palette (Soft, Premium)

```css
/* Primary actions */
--color-primary: #4F46E5;      /* Indigo - calm but actionable */
--color-primary-hover: #4338CA;

/* Mode indicators */
--color-flow-state: #0EA5E9;   /* Sky blue - calm flow */
--color-strategy: #8B5CF6;     /* Purple - thoughtful */

/* Priority indicators (soft, not alarming) */
--color-priority-high: #F97316;    /* Orange, not red */
--color-priority-medium: #EAB308;  /* Amber */
--color-priority-normal: #6B7280;  /* Gray */

/* Success/Complete */
--color-success: #10B981;      /* Emerald */

/* Backgrounds */
--color-bg-primary: #FFFFFF;
--color-bg-secondary: #F9FAFB;
--color-bg-card: #FFFFFF;
--color-border: #E5E7EB;
```

### 8.3 Component Specifications

#### 8.3.1 Break Room Cards

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Width: 280px                                           │
│  Height: 320px                                          │
│  Border-radius: 16px                                    │
│  Shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)             │
│  Padding: 24px                                          │
│                                                         │
│  Title: 20px, font-weight: 600                          │
│  Subtitle: 14px, color: gray-500                        │
│  Description: 14px, color: gray-600, line-height: 1.5   │
│  Button: Full width, 44px height, border-radius: 8px    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 8.3.2 Priority Cards (Strategy Mode)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Width: Flex (1/3 of container - gap)                   │
│  Min-height: 240px                                      │
│  Border-radius: 12px                                    │
│  Border: 1px solid var(--color-border)                  │
│  Padding: 20px                                          │
│                                                         │
│  Debtor Name: 18px, font-weight: 600                    │
│  Balance: 28px, font-weight: 700, color: primary        │
│  Category: 12px, uppercase, tracking-wide               │
│  Days Overdue: 14px, color: gray-600                    │
│  Why Now: 13px, color: gray-700, bulleted list          │
│  CTA Button: Ghost style, right-aligned                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 8.3.3 Flow State Countdown

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Countdown: 64px, font-weight: 700, tabular-nums        │
│  Format: "0:45" (minutes:seconds)                       │
│  Progress bar: 4px height, rounded, animated            │
│  Animation: Smooth decrease, pulse at <10 seconds       │
│                                                         │
│  On completion: Fade transition to call screen          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 8.4 Responsive Behavior

| Breakpoint | Break Room | Strategy Mode | Flow State |
|------------|------------|---------------|------------|
| Desktop (1280px+) | 2x2 grid | 3 cards | Centered |
| Tablet (768-1279px) | 2x2 grid | 2 cards + scroll | Centered |
| Mobile (<768px) | Stacked | 1 card + swipe | Full screen |

---

## 9. Implementation Phases

### Phase 1: Break Room & Strategy Mode (MVP)
**Estimated Effort:** 3 days

#### 9.1.1 Break Room Landing Page
- [ ] Create new route: `/` (replace current dashboard)
- [ ] Design greeting with time-of-day logic
- [ ] Add "Today's Snapshot" summary component
- [ ] Create mode selection cards (Flow State, Strategy, Performance, Floor)
- [ ] Add role-based visibility for Floor View
- [ ] Wire queue count display

#### 9.1.2 Strategy Mode - Top 3 Priorities
- [ ] Create `TopPrioritiesView` component
- [ ] Design priority card component with "Why Now"
- [ ] Add "View All" expandable section (collapsed by default)
- [ ] Wire to existing `useWorkQueue` hook with limit=3
- [ ] Add "Return to Break Room" navigation

#### 9.1.3 Strategy Mode - Workbench Enhancements
- [ ] Add "Your Notes" editable section to SmartScript
- [ ] Notes persist in local state (not backend) during session
- [ ] Add "Back to Priorities" navigation
- [ ] Update "Call Now" button styling

#### 9.1.4 "Why Now" Reasoning
- [ ] Add `priorityReasons` to work queue DTO
- [ ] Implement reasoning logic in api-collectors
- [ ] Display reasons on priority cards

### Phase 2: Flow State Mode
**Estimated Effort:** 2 days

#### 9.2.1 Flow State Container
- [ ] Create `FlowStateView` component
- [ ] Design countdown timer with progress bar
- [ ] Add "Why Now" context card
- [ ] Add "Up Next" preview (2 items, no interaction)
- [ ] Add skip button with confirmation

#### 9.2.2 Auto-Connect Integration
- [ ] Create `useTwilioDevice` hook
- [ ] Initialize Twilio Device on Flow State entry
- [ ] Trigger call on countdown completion
- [ ] Handle call events (connect, disconnect, error)
- [ ] Auto-advance to next account after disposition

#### 9.2.3 Skip Limits
- [ ] Add skip counter to user preferences (Zustand)
- [ ] Implement hourly reset logic
- [ ] Display remaining skips in UI
- [ ] Disable skip button when limit reached

### Phase 3: Session Tracking & Analytics
**Estimated Effort:** 2 days

#### 9.3.1 Session Backend
- [ ] Create `CollectorSession` entity
- [ ] Add session start/end endpoints
- [ ] Track mode, accounts worked, skips used

#### 9.3.2 Team Lead Visibility
- [ ] Add mode indicator to FloorMap
- [ ] Show "In Flow State" vs "In Strategy Mode"
- [ ] Add session duration to collector cards

#### 9.3.3 Analytics
- [ ] Track mode usage per collector
- [ ] Track skip frequency
- [ ] Track accounts worked per mode
- [ ] Add to performance dashboard

### Phase 4: Polish & Edge Cases
**Estimated Effort:** 1 day

#### 9.4.1 Edge Cases
- [ ] Empty queue state (all caught up!)
- [ ] Network disconnection during Flow State
- [ ] Call failure handling
- [ ] Session timeout warnings

#### 9.4.2 Animations & Transitions
- [ ] Mode entry/exit transitions
- [ ] Card hover effects
- [ ] Countdown pulse animation
- [ ] Success celebrations (optional)

---

## 10. Success Metrics

### 10.1 Collector Productivity

| Metric | Target | Measurement |
|--------|--------|-------------|
| Accounts worked per hour (Flow State) | +20% vs baseline | Session analytics |
| Time to first call (Strategy Mode) | <3 minutes | Session analytics |
| Skip rate (Flow State) | <15% of accounts | Skip tracking |
| Mode adoption | Both modes used | Mode selection analytics |

### 10.2 Collector Satisfaction

| Metric | Target | Measurement |
|--------|--------|-------------|
| "System helps me" agreement | >80% | Survey |
| "I feel in control" agreement | >80% | Survey |
| "UI is calm/pleasant" agreement | >70% | Survey |
| Voluntary mode switching | >20% switch modes daily | Analytics |

### 10.3 Business Outcomes

| Metric | Target | Measurement |
|--------|--------|-------------|
| Collection rate | +10% vs baseline | Financial reports |
| Collector retention | Improve by 15% | HR metrics |
| Training time for new collectors | Reduce by 25% | Onboarding tracking |

---

## 11. Open Questions & Decisions

### 11.1 Resolved Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Manager-enforced vs collector choice? | **Collector choice** | Empowerment over control |
| Per-account vs per-session mode? | **Per-session** | Simplicity, commitment to style |
| How to switch modes? | **Return to Break Room** | Clear mental break, intentional choice |
| Countdown duration? | **45 seconds default** | Balance prep time vs momentum |

### 11.2 Open Questions

| Question | Options | Notes |
|----------|---------|-------|
| Skip limit per hour? | 3? 5? 10? | Need to balance anti-gaming vs flexibility |
| Should skip require reason? | Yes/No | Data useful but adds friction |
| Can managers see skip reasons? | Yes/No | Transparency vs surveillance feel |
| Notes persist across sessions? | Yes/No | Useful but storage cost |
| Flow State for Team Leads? | Yes/No | Do leads need to work accounts? |

---

## 12. Progress Tracking

### 12.1 Current Status

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Break Room & Strategy Mode | **Complete** | 100% |
| Phase 2: Flow State Mode | **Complete** | 100% |
| Phase 3: Session Tracking | Not Started | 0% |
| Phase 4: Polish | In Progress | 60% |

### 12.2 Implementation Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-18 | Document created | - |
| 2026-01-18 | Break Room implemented with mode cards, greeting, today's snapshot | Robert Torres |
| 2026-01-18 | Strategy Mode implemented with Top 3 Priority cards | Robert Torres |
| 2026-01-18 | Flow State implemented with countdown timer, Why Now card, Up Next preview | Robert Torres |
| 2026-01-18 | Collector preferences Zustand store created | Robert Torres |
| 2026-01-18 | Workbench updated with mode-aware navigation | Robert Torres |
| 2026-01-19 | Dark mode applied as default across all ui-collectors screens | Robert Torres |
| 2026-01-19 | Call status bar and End Call UI added to workbench | Robert Torres |
| 2026-01-19 | Performance page fixed: dark mode + navigation to Break Room | Robert Torres |
| 2026-01-19 | Flow State polish: Skip button moved beside Connect, timer ring enlarged, bottom spacing | Robert Torres |

### 12.3 File Changes Tracker

**New Files Created:**
- [x] `src/routes/index.tsx` - Break Room landing page
- [x] `src/routes/strategy.tsx` - Strategy Mode with Top 3 Priorities
- [x] `src/routes/flow-state.tsx` - Flow State with auto-connect countdown
- [x] `src/routes/performance.tsx` - Performance dashboard (dark mode)
- [x] `src/features/strategy/components/PriorityCard.tsx` - Priority card with Why Now
- [x] `src/features/flow-state/components/CountdownTimer.tsx` - Circular countdown with progress ring
- [x] `src/features/flow-state/components/WhyNowCard.tsx` - AI reasoning display
- [x] `src/features/flow-state/components/UpNextPreview.tsx` - Next accounts preview
- [x] `src/shared/store/collectorPreferencesStore.ts` - Session state management
- [ ] `src/features/flow-state/hooks/useTwilioDevice.ts` - Twilio Device management (pending)

**Files Modified:**
- [x] `src/routes/workbench/$debtorId.tsx` - Call status bar, End Call UI, dark mode
- [x] `src/features/workbench/components/DebtorHero.tsx` - Dark mode styling
- [x] `src/features/workbench/components/SmartScript.tsx` - Dark mode styling
- [x] `src/features/workbench/components/DispositionPanel.tsx` - Dark mode styling
- [x] `src/features/workbench/components/ContextTimeline.tsx` - Dark mode styling
- [x] `src/features/negotiation/components/NegotiationSidebar.tsx` - Dark mode styling
- [x] `src/features/negotiation/components/PaymentSlider.tsx` - Dark mode styling
- [ ] `src/features/queue/hooks/useWorkQueue.ts` - Add top priorities query (pending)
- [ ] `src/shared/services/voiceService.ts` - Add Twilio Device management (pending)

**Backend Files (api-collectors) - Not Yet Started:**
- [ ] `src/work-queue/work-queue.controller.ts` - Add top-priorities endpoint
- [ ] `src/work-queue/work-queue.service.ts` - Add priority reasoning logic
- [ ] `src/work-queue/dto/priority-reasons.dto.ts` - New DTO

### 12.4 Remaining Work

**Phase 3: Session Tracking (Backend)**
- Collector session entity and endpoints
- Mode tracking for team lead visibility
- Skip tracking and analytics

**Phase 4: Polish (Remaining)**
- Twilio Device integration for actual calls
- Empty queue celebration state
- Network disconnection handling
- Session timeout warnings
- Success animations

---

## Appendix A: Competitor Research Summary

### A.1 Sources Consulted

- [Kolleno: Top 12 Debt Collection Software 2025](https://www.kolleno.com/top-12-best-debt-collection-software-of-2025-features-reviews/)
- [MeridianLink Collect](https://www.meridianlink.com/products/collect/)
- [Latitude by Genesys](https://www.genesys.com/solutions/latitude-collections)
- [CallTools: Preview vs Predictive Dialer](https://calltools.com/blog/choosing-between-a-predictive-dialer-or-preview-dialer/)
- [Credgenics: Dialer for Debt Collections](https://www.credgenics.com/dialer-for-debt-collections)
- [McKinsey: Seven Pillars of Collections Wisdom](https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/the-seven-pillars-of-collections-wisdom)

### A.2 Key Takeaways

1. **No competitor offers collector-level mode choice** - This is our differentiator
2. **Preview dialers are preferred for complex accounts** - Validates Strategy Mode
3. **Account ownership increases recovery rates** - Validates sticky collector model
4. **Configurable work queues are table stakes** - We have this already
5. **Real-time dashboards expected** - Floor View addresses this

---

**End of Document**
