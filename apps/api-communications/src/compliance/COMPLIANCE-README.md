# `compliance` Module

## 1. Overview

The `compliance` module is a critical gatekeeper within the `api-communications` microservice. Its sole purpose is to ensure that every outbound communication attempt adheres to legal regulations (e.g., FDCPA), industry best practices, and debtor-specific preferences before it is dispatched.

It functions as a rule engine that is called by the `dispatch` module. By centralizing all compliance logic, it provides a single, reliable point of control for preventing non-compliant communications.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **The Compliance Rule Engine:** It owns the `ComplianceService`, which orchestrates the execution of a series of compliance checks.
-   **Individual Compliance Rules:** It defines and implements specific, self-contained rules, such as checking for opt-outs, time-of-day restrictions, and contact frequency limits.
-   **The `ComplianceRule` Interface:** It defines the standard contract that all compliance rule classes must implement, ensuring consistency and extensibility.

### What This Module Does NOT Own

-   **Debtor Preferences:** It does not store debtor preferences. It fetches this data from the `preferences` module to perform its checks.
-   **Communication History:** It does not store communication logs. It fetches recent communication history from the `logs` module to evaluate frequency limits.
-   **Dispatch Logic:** It does not send communications. It only returns an `allowed: true` or `allowed: false` result to the `dispatch` module, which then acts accordingly.

---

## 3. Endpoints & Entities

This module is purely an internal service layer and does not expose any API endpoints. It also does not define any of its own database entities, but rather consumes the `DebtorPreference` entity from the `preferences` module and the `CommunicationLog` schema from the `logs` module.

---

## 4. Key Concepts & Patterns

### Rule Engine (Strategy Pattern)

The core of this module is a rule engine designed using the Strategy Pattern.

1.  **`ComplianceRule` Interface:** A common interface defines the contract for all rules. Each rule must have a `name` property and an async `check(context)` method that returns a `ComplianceResult`.
2.  **Concrete Rule Implementations:** Each specific compliance check is encapsulated in its own class that implements the `ComplianceRule` interface. The initial rules are:
    -   `OptOutRule`: Checks if the debtor has a global "do not contact" flag or has opted out of the specific communication channel.
    -   `TimeOfDayRule`: Enforces time restrictions (e.g., no contact before 8 AM or after 9 PM).
    -   `FrequencyLimitRule`: Checks if the number of contacts within a given period (e.g., per day) exceeds a defined limit.
3.  **`ComplianceService` Orchestrator:** The service holds an ordered list of these rule instances. When its `checkCompliance` method is called, it iterates through the rules and executes them in sequence.

### Fail-Fast Execution

The `ComplianceService` is designed to "fail fast." It executes the rules in a specific, hardcoded order of precedence:

1.  `OptOutRule`
2.  `TimeOfDayRule`
3.  `FrequencyLimitRule`

As soon as any rule returns a result of `allowed: false`, the execution chain stops immediately, and the failure result is returned to the caller. This is highly efficient and ensures that fundamental blockers like opt-outs are checked before more complex rules.

### Efficient Data Hydration

Before executing any rules, the `ComplianceService`'s `checkCompliance` method first fetches all the data needed by the rules—the debtor's preferences and their recent communication history—in a single, parallel operation (`Promise.all`). This data is then added to the `ComplianceContext` object that is passed to each rule. This "data hydration" pattern is efficient because it prevents each individual rule from having to make its own separate database calls.

---

## 5. Events

This module does not publish or subscribe to any events. The result of its compliance check is used by the `dispatch` module to determine whether to publish a `CommunicationDispatched` or `CommunicationBlocked` event.

---

## 6. Dependencies & Integrations

### Internal Dependencies

-   **`preferences` module:** A critical dependency. The `ComplianceService` injects the `PreferencesService` to fetch the debtor's contact preferences, which are essential for the `OptOutRule` and for customizing the behavior of other rules.
-   **`logs` module:** The service injects the `LogsService` to retrieve recent communication history for a debtor. This data is used by the `FrequencyLimitRule` to count recent contacts.

### External Integrations

This module has no direct external integrations.

---

## 7. Gaps & Future Work

-   **Timezone-Unaware Time Checks:** The `TimeOfDayRule` currently checks the time based on the server's local timezone (`new Date().getHours()`). For true FDCPA compliance, this rule must be updated to be timezone-aware, performing its check based on the debtor's local timezone, not the server's.
-   **Static Rule Set:** The list of compliance rules is hardcoded in the `ComplianceService` constructor. A more advanced implementation could make this dynamic, allowing rules to be enabled, disabled, or configured on a per-organization basis.
-   **Hardcoded Look-back Period:** The service currently hardcodes a 7-day look-back period when fetching recent communications for the frequency check. This could be made more flexible or configurable if different compliance scenarios require different time windows.
