# Domain Feature Requirements & Gap Analysis

**Based on:** `MANAGER_ADMIN_FEATURES_PLAN.md` and `UI-USER-EXPERIENCE-REDESIGN.md`
**Aligned with:** The Five Quiet Domains (Master Spec v3.0)
**Status:** Unimplemented Requirements Inventory

---

## I. THE PULSE (Real-Time Operations)
*Target Route: `/pulse`*

### 1. Live Activity Feed (Unimplemented)
**Requirement:** A Twitter-style feed showing real-time collector actions.
*   **Events:** "Sarah called Debtor X", "Mike secured Promise to Pay ($500)", "System flagged compliance risk".
*   **Tech:** Needs WebSocket integration (already scaffolded but not wired).
*   **Source:** `MANAGER_ADMIN_FEATURES_PLAN.md` (2.1)

### 2. Velocity Charts (Unimplemented)
**Requirement:** Real-time visual metrics for the current day.
*   **Metrics:** Contacts per hour, Payment velocity ($/hr).
*   **Visualization:** Line charts updating in real-time.
*   **Source:** `MANAGER_ADMIN_FEATURES_PLAN.md` (2.1)

### 3. Compliance Alerts Banner (Unimplemented)
**Requirement:** Conditional banner showing active risks.
*   **Triggers:** FDCPA warnings, Cease & Desist triggers, Failed logic.
*   **Source:** `UI-USER-EXPERIENCE-REDESIGN.md` (Manager Dashboard)

---

## II. THE STRATEGY (Rules & Logic)
*Target Route: `/strategy`*

### 1. Workflow Automation Rules (Unimplemented)
**Requirement:** Logic engine for automatic actions.
*   **Triggers:** "Balance > $10k", "Account Age > 90 days".
*   **Actions:** "Escalate to Manager", "Assign to Team Lead".
*   **Current State:** `workflowService.ts` is 670 lines of commented-out code.
*   **Source:** `UI-USER-EXPERIENCE-REDESIGN.md` (/workflows)

---

## III. THE INVENTORY (Data & Assets)
*Target Route: `/inventory`*

### 1. Portfolio Health Analytics (Unimplemented)
**Requirement:** Strategic analysis of debt tranches.
*   **Aging Analysis:** 30/60/90/120+ day buckets.
*   **Risk Indicators:** Accounts approaching Statute of Limitations (SOL).
*   **Recovery Probability:** Predicted recovery rate per bucket.
*   **Source:** `MANAGER_ADMIN_FEATURES_PLAN.md` (2.3)

---

## IV. THE ROSTER (Human Capital)
*Target Route: `/roster`*

### 1. Smart Work Assignment Wizard (Unimplemented)
**Requirement:** Bulk assignment tool with intelligence.
*   **Strategies:**
    *   *Load Balancing:* Distribute evenly based on current queue size.
    *   *Skill-Based:* Route high-value accounts to top performers.
    *   *Geographic:* Assign by time zone compatibility.
*   **UI:** Wizard with "Preview Distribution" step before committing.
*   **Source:** `MANAGER_ADMIN_FEATURES_PLAN.md` (1.2)

### 2. Performance Coaching Tools (Unimplemented)
**Requirement:** Drill-down into individual collector metrics.
*   **Comparison:** Side-by-side view (Collector A vs. Collector B).
*   **Trend Analysis:** 30/60/90 day performance slopes.
*   **Coaching Notes:** Ability to log 1-on-1 session notes attached to the collector profile.
*   **Source:** `MANAGER_ADMIN_FEATURES_PLAN.md` (2.2)

### 3. Shift Management (Unimplemented)
**Requirement:** Time and attendance tracking.
*   **Features:** Weekly schedule grid, Time-off requests, Coverage alerts.
*   **Source:** `MANAGER_ADMIN_FEATURES_PLAN.md` (3.2)

### 4. Custom Goal Setting (Unimplemented)
**Requirement:** Define KPIs for teams and individuals.
*   **Types:** Contact volume, Promise conversion %, $ Collected.
*   **Granularity:** Team-wide defaults + Individual overrides.
*   **Source:** `MANAGER_ADMIN_FEATURES_PLAN.md` (1.3)

---

## V. THE RULES (System Configuration)
*Target Route: `/rules`*

### 1. Organization Settings (Unimplemented)
**Requirement:** Global configuration hub.
*   **Business Rules:** Payment methods, Gateway config.
*   **Compliance:** State-specific rule toggles.
*   **Source:** `MANAGER_ADMIN_FEATURES_PLAN.md` (5.1)

### 2. Script & Template Management (Unimplemented)
**Requirement:** Content management for communications.
*   **Library:** Call scripts (Opening/Closing), Email templates.
*   **Approval:** Mark as "Compliance Approved".
*   **Source:** `MANAGER_ADMIN_FEATURES_PLAN.md` (4.2)
