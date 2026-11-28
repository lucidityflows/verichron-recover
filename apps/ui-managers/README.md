# `ui-managers`: Verichron Command Center

**Type:** Enterprise Command & Control (ERP)  
**Target Audience:** Admin, Manager, Team Lead, Collector  
**Current Status:** Phase 2 Complete (Admin/Manager Architecture)  
**Design Philosophy:** Exception-Based Management ("Quiet Power")

---

## 1. Executive Vision

`ui-organizations` is the operational brain of the Debt Lucidity Solutions platform. We have transitioned from a standard "collection app" to a **Predictive Command & Control System**.

The interface is built on the philosophy of **"Quiet Power"**: the system remains visually quiet when operations are within performance thresholds and only becomes "loud" (Amber/Red) when human intervention is required. This shifts managers from reactive firefighting to strategic optimization.

### Core Design Pillars
1.  **Exception-Based Management:** A "Zero-Inbox" workflow for approvals and risks. If the inbox is empty, the organization is healthy.
2.  **Predictive Operations:** We don't just show what happened; we show what *will* happen (e.g., EOD Revenue Projections, Staff Overload Warnings).
3.  **Audit-First Integrity:** Every strategic change (Rule update, Settlement approval) requires a Reason Code, creating an immutable logic trail.
4.  **Hybrid AI:** We use AI to suggest (Data Mapping, Entity Resolution), but Humans always decide.

---

## 2. The Five "Quiet" Domains (Admin/Manager)

The Admin & Manager experience is strictly organized into five functional domains. This architecture replaces the traditional "mega-menu" with high-density, purpose-built workspaces.

### I. THE PULSE (Real-Time Operations)
*The heartbeat of the agency. Used for minute-by-minute situational awareness.*
*   **Control Tower:** A velocity speedometer showing real-time liquidation vs. goals, with **Bayesian EOD Projections** (e.g., "Projected: $45k - $52k").
*   **Escalation Inbox:** A "Zero-Inbox" center for items requiring human decisions (Financial approvals > threshold, Compliance blocks, Technical failures).

### II. THE STRATEGY (Business Logic)
*The brain of the operation. Where money is made through policy.*
*   **Settlement Strategy Builder:** A matrix-based authority system (Balance Range × Age × Tier) that defines max discount percentages.
*   **Payment Plan Orchestrator:** Auto-approval thresholds and dunning automation rules.
*   **Communication Hub:** Template library for Email/SMS/Letters with version control and approval workflows.

### III. THE INVENTORY (Assets & Data)
*The warehouse. Managing the debt portfolios.*
*   **Portfolio ROI Dashboard:** Tracks "True Profitability" (Purchase Price vs. Net Recovery - Direct Costs).
*   **Ingestion Center (The Repair Shop):** An AI-augmented pipeline for importing creditor files. Uses a 3-tier validation system (Syntax → Business → Semantic) to flag errors and suggest fixes without blocking the stream.
*   **Creditor Master:** The "Source of Truth" for original creditors, featuring AI-powered entity resolution (e.g., mapping "JPM Chase" to "JPMorgan Chase").

### IV. THE ROSTER (Human Capital)
*The team. Optimizing collector performance and allocation.*
*   **Resource Optimizer:** A drag-and-drop interface for mapping Portfolios to Teams. Features **Impact Preview**, a predictive gauge that warns managers of "Collector Crushing" (overload) *before* they commit an assignment.
*   **Performance Coaching:** High-density drill-down into RPC rates, Promise-to-Pay conversion, and revenue-per-hour metrics.

### V. THE RULES (Governance)
*The law. Configuring the boundaries of the system.*
*   **Compliance Hub:** Centralized management of FDCPA/TCPA guardrails. Distinguishes between **Hard Locks** (Federal Law, system-enforced) and **Soft Locks** (Client Policy, override-able with audit).
*   **Global Settings:** Agency-wide configuration.

---

## 3. The Workstations (Under Re-imagination)

While the Admin/Manager tier has been rebuilt for "Command & Control," the operational tiers are currently being redesigned to align with this new strategy.

### The Team Lead Workstation
*Focus: Tactical Coaching & Floor Management*
*   **Current Status:** Concept Phase.
*   **Vision:** A team-scoped slice of "The Pulse" focused on active collector status, live call monitoring, and intra-day intervention.

### The Collector Workstation
*Focus: Distraction-Free Execution & Compliance*
*   **Current Status:** Phase 1 Complete (Stable).
*   **Key Features Available Now:**
    *   **Compliance Warning System:** Visual FDCPA alerts (Deceased, C&D, Bankruptcy) that physically block non-compliant actions.
    *   **Enhanced Action Log:** Keyboard-driven modal (`Ctrl+Enter`) with outcome-specific fields and templates.
    *   **Quick Payment Modal:** "One-hand" payment entry with real-time balance calculation.
    *   **Global Shortcuts:** Hotkeys for rapid navigation (`Ctrl+P`, `Ctrl+N`).
*   **Vision (V2):** Will evolve into a "Flow State" interface driven by a smart work queue that prioritizes the "Next Best Action" automatically.

---

## 4. Technical Standards & Patterns

### The "Drill-to-Work" Workflow
Every chart and data point is a doorway. Clicking a "High Risk" segment in a pie chart doesn't just show a tooltip; it navigates to the Work Queue pre-filtered to those specific accounts.

### Visual Language ("Quiet Power")
*   **🔴 Red:** Legal/Compliance Risk or System Failure. Immediate action required.
*   **🟡 Amber:** Operational Warning (Below Goal, Capacity Risk). Attention required.
*   **🟢 Green:** Healthy/On-Track. No action required.
*   **🟣 Purple/Gold:** Elite Performance. Recognition opportunity.
*   **🔵 Blue:** Informational/Neutral.

### Technology Stack
*   **State Management:** Zustand (UI State) + TanStack Query (Server State).
*   **Routing:** TanStack Router (Type-safe, file-based routing).
*   **Visualization:** Recharts (Analytics) + TanStack Virtual (High-performance grids).
*   **Forms:** React Hook Form + Zod (Validation).
*   **API:** Orval-generated clients (Syncs with OpenAPI spec).

---

## 5. Directory Structure

The project follows a **Feature-Sliced Design** approach, currently migrating towards the Five Domain structure.

```text
apps/ui-organizations/src/
├── features/
│   ├── pulse/         # Dashboard, Control Tower, Inbox
│   ├── strategy/      # Settlements, Rules, Templates
│   ├── inventory/     # Portfolios, Ingestion, Creditors
│   ├── roster/        # Teams, Users, Coaching
│   ├── rules/         # Compliance, Settings
│   └── collector/     # (Legacy) Collector Workstation Features
├── routes/            # TanStack Router definitions
├── shared/            # Reusable UI components (The "Quiet" Design System)
├── api/               # Generated API clients
└── app/               # App entry, providers, global styles
```

---

*For detailed architectural decisions, refer to `docs/PRODUCT-DESIGN-STRATEGY.md`.*