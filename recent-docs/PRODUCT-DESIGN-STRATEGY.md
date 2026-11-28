---

  📘 Verichron Command Center: Final Master Specification (v3.0)

  Document Version: 3.0 (Post-Critical Analysis)  
  Target: ui-organizations / api-organizations / api-debts / api-transactions  
  Philosophy: Exception-Based Action, Strategic "Hard/Soft" Compliance, and Hybrid AI.

  ---

  1. Executive Vision
  Verichron Command Center is the industry's first Predictive Command & Control platform for debt collection. It replaces notification fatigue with a "Zero-Inbox" escalation workflow and manual data entry with an AI-augmented repair shop. Version 3.0 ensures that strategic leadership has absolute control over
  Settlement Authority, Payment Lifecycle, and Net ROI.

  ---

  2. Updated Information Architecture (The Sitemap)

  To maintain the "Quiet" experience, the system is now organized into five high-density domains:

  I. THE PULSE (Real-Time Operations)
   * Control Tower: Velocity speedometer with Confidence Range Projections ($45k-$52k EOD). Includes a live staff heatmap.
   * Escalation Inbox: Human-decision-required list (Approvals, Compliance Flags, System Errors).

  II. THE STRATEGY (Rules & Logic)
   * Settlement Strategy Builder: (NEW) Matrix-based authority rules (Balance × Age × Tier).
   * Payment Plan Orchestrator: (NEW) Auto-approval thresholds and dunning automation rules.
   * Compliance Hub: Jurisdiction-aware guardrails (Federal Hard Locks vs. Client Soft Locks).
   * Communication Hub: (NEW) Template library (Email/SMS/Letter) with version control and approval flows.

  III. THE INVENTORY (Data & Assets)
   * Portfolio ROI Dashboard: (NEW) Purchase price vs. Net Recovery, cost-to-collect tracking, and IRR metrics.
   * Ingestion Center: 3-tier AI validation pipeline and "The Repair Shop" UI.
   * Creditor Master: Entity resolution and deduplication engine.

  IV. THE ROSTER (Human Capital)
   * Resource Optimizer: Portfolio-to-Team mapping with Impact Preview (Projected Utilization).
   * Performance Coaching: RPC (Right Party Contact) rates, revenue-per-hour, and "Promises Kept" benchmarking.

  ---

  3. Module Specification: Settlement Strategy Builder (The "Deal-Breaker" Fix)

  Goal: Decentralize negotiation power while maintaining strict financial control.

  The Authority Matrix:
  Admins define a grid that determines the "Maximum Discount %" a user can offer without escalation.
   * Axis Y: Debt Balance Ranges ($0-$500, $500-$5k, $5k+).
   * Axis X: Days Since Placement (0-30, 31-90, 90+).
   * Cell Value: % Discount (e.g., 25%).

  Tiered Overrides:
   * Collector: Can offer up to the Matrix limit.
   * Manager: Can override Matrix up to +20%.
   * Admin: Absolute authority. 
   * Action: Any offer exceeding the Collector tier automatically lands in the Escalation Inbox for Manager approval.

  ---

  4. Module Specification: AI-Enhanced Ingestion (The "Moat")

  The "Quick Accept" Workflow:
  To solve the AI trust problem, we implement a Human-Verification-at-Scale UI:
   * The "Green Strip": All AI suggestions with >95% confidence are grouped at the top.
   * Action: A single "Verify & Accept All (X) Suggestions" button allows the manager to scan the list and commit in bulk.
   * The "Amber/Red" Grid: Low-confidence items require row-by-row manual correction in the virtualized grid.

  ---

  5. Module Specification: Portfolio ROI (The "C-Suite" Requirement)

  Goal: Measuring net profitability, not just gross collections.

  Metrics to Track:
   * Gross Collections: Total cash received.
   * Direct Costs: Commission, Skip Tracing fees, Legal/Litigation costs.
   * Net Recovery: Gross - Costs.
   * Liquidation Rate: Net Recovery / Total Portfolio Face Value.
   * IRR (Internal Rate of Return): Time-weighted profitability of the tranche.

  ---

  6. Technical & Visual Standards

  A. The Performance Color Standard
   * 🔴 Red: Legal/Compliance risk or System Outage (Immediate Action).
   * 🟡 Amber: Performance below threshold or Overload (Attention Required).
   * 🟢 Green: On track.
   * 🔵 Blue: Informational/System updates.
   * 🟣 Purple/Gold: (NEW) Exceptional Performance (Recognize & Replicate).

  B. "Audit-First" Mutations
  Every change to Strategy (Settlements, Plans, Compliance) requires a Reason Code.
   * Backend: The API enforces a reason_code_id in the meta object of the request.
   * UI: A "Change Management" drawer appears when a user hits "Save," listing the impact of their change.

  C. Predictive Projection UI
  The Control Tower projection must be presented as a Probabilistic Range:
   * Visual: A "fan" chart showing the likely trajectory of the day's revenue.
   * Context: Hovering shows the "Why" (e.g., "Current pace is 12% higher than historical Tuesday average").

  ---

  7. Build vs. Exclude Boundaries (Refined)


  ┌────────────────────────────────────────────┬─────────────────────────────────────────┐
  │ BUILD (Differentiators)                    │ EXCLUDE (Noise)                         │
  ├────────────────────────────────────────────┼─────────────────────────────────────────┤
  │ Settlement Matrix UI (Rule-based autonomy) │ Manual account-by-account dunning       │
  │ Impact Preview (Predictive team loading)   │ General HR/Payroll (Leave in api-users) │
  │ AI Repair Shop (User-controlled fixing)    │ "Black Box" auto-importing              │
  │ EOD Projections (Bayesian forecasting)     │ Purely historical/static PDF reports    │
  └────────────────────────────────────────────┴─────────────────────────────────────────┘

  ---

  8. Master Feedback Questions (Internal Review)
   1. On Communication: Should managers be able to edit Twilio/SendGrid settings directly in the Communication Hub, or should that remain a purely Technical/IT setting?
   2. On Ingestion: If an import has > 50 errors, the system generates an "Error CSV." Should we include an AI-suggested fix column inside that CSV to help them fix it in Excel?
   3. On Coaching: Should "Purple/Gold" status (Top Performers) trigger an automatic Manager Recognition Task in the Escalation Inbox?

  ---
  End of Final Master Specification
