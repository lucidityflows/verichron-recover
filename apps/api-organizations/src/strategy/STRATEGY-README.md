# `strategy` Feature Module

## 1. Overview
The `strategy` module is the "Policy Engine" of the `api-organizations` microservice. It manages the high-stakes relational data that dictates automated decision-making across the platform, specifically for **Settlements** and **Payment Plans**.

This module bridges the gap between organizational hierarchy and financial authority, ensuring that every negotiation is bound by strict, manager-defined guardrails.

---

## 2. Ownership & Boundaries

### What This Module Owns
*   **Settlement Authority Matrix:** The relational grid defining max discounts based on Balance Range vs. Debt Age.
*   **Tiered Authority Ladder:** Storing the "ladder" of approval thresholds (e.g., Collector: 20%, Team Lead: 35%, Manager: 50%).
*   **Payment Plan Strategy:** Rules for auto-approval thresholds, minimum down-payments, and max durations.
*   **Strategy Change Management:** Enforcing audit-first mutations (Reason Codes) for any change to these tactical rules.

### What This Module Does NOT Own
*   **Enforcement:** It does not block transactions directly. It provides the "Rule" to `api-transactions`, which then performs the enforcement.
*   **Active Offers:** Individual settlement offers are owned by `api-transactions`.
*   **Global Preferences:** Non-financial settings (e.g., timezones, branding) are owned by the `settings` module.

---

## 3. Entities (Proposed)

### `SettlementAuthorityMatrix`
*   **Purpose:** Relational storage of the discount grid.
*   **Fields:** `organizationId`, `minBalance`, `maxBalance`, `minAgeDays`, `maxAgeDays`, `maxDiscountPercent`.

### `ApprovalThreshold`
*   **Purpose:** Defines the "Escalation Trigger" for human roles.
*   **Fields:** `organizationId`, `roleType` (Enum: COLLECTOR, TEAM_LEAD), `maxDiscountPercent`, `maxDollarAmount`.

---

## 4. Key Concepts & Patterns

### Relational vs. Blob
Unlike the `settings` module which uses JSONB for flexibility, the `strategy` module uses standard relational tables. This ensures:
1.  **Type Safety:** Grid values are validated as numerics at the database level.
2.  **Complex Queries:** `api-transactions` can perform fast JOINs or lookups to find the specific rule applicable to an account.

### Audit-First Mutations
Every update to a strategy requires a `reasonCode`. This module integrates with the global organization audit trail to maintain legal transparency for regulatory bodies.

---

## 5. Integration Points
*   **Consumed by `ui-organizations`:** For the Settlement Strategy Builder UI.
*   **Consumed by `api-transactions`:** During `SettlementOffer` creation to determine if `status` should be `ACTIVE` or `PENDING_APPROVAL`.
*   **Consumed by `api-workflows`:** To trigger auto-assignment based on portfolio strategy.
