# MVP Feature Gaps

This document tracks the remaining high-priority feature gaps required for the Verichron platform MVP.

## 1. Admin Self-Service (Priority High)
The current Organization Admin experience is largely a placeholder.
*   **Requirement:** Implement General Settings (Logo, Primary Contact, Commission Tiers).
*   **Requirement:** Implement Team Management UI (Add/Remove members, edit roles).
*   **Requirement:** Implement Compliance Rule Configuration (e.g., State-specific calling hours).

## 2. Server-Synced "Smart" Features
Several features currently rely on `localStorage`, which prevents multi-device support.
*   **Requirement:** Move Goals System state to `api-collectors` database.
*   **Requirement:** Move Filter Presets to `api-organizations` or `api-users`.
*   **Requirement:** Move Smart Action Suggestions to backend logic (e.g., based on debt state).

## 3. Actionable Analytics
Dashboard metrics are currently static and do not allow for deeper investigation.
*   **Requirement:** Every metric card on the Manager Dashboard must be a link.
*   **Requirement:** Clicking a metric (e.g., "High Risk Accounts") should navigate to a pre-filtered list of those accounts in the Work Queue or Debtors view.

## 4. Test Coverage
*   **Requirement:** Implement Vitest + Testing Library for critical UI paths like Compliance warnings and Action logging.
*   **Requirement:** Increase integration test coverage for the `event-orchestrator`.
