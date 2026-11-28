# `common` Module

## 1. Overview

The `common` module within the `api-automations` microservice serves as a repository for shared utilities and helper functions that are reusable across different feature modules. It centralizes generic logic, promoting code reuse and reducing duplication in an event-driven automation engine.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Reusable Helpers:** It owns generic helper functions that encapsulate logic needed by multiple automation features (e.g., condition evaluation).

### What This Module Does NOT Own

-   **Specific Business Logic:** It does not contain any specific business logic for `auto-assignment` or `escalation`. Instead, it provides the fundamental tools that those modules use to execute their logic.
-   **API Endpoints or Database Entities:** This module is purely a utility layer and does not expose any API endpoints or define any database entities.

---

## 3. Entities

This module does not define or manage any database entities.

---

## 4. Endpoints

This module does not expose any API endpoints.

---

## 5. Key Concepts & Patterns

### Condition Evaluation Engine
The core component of this module is the `ConditionEvaluator` helper. This class provides a robust and dynamic engine for evaluating a set of rules against a given data payload.

-   **Dynamic Rule Processing:** It accepts an array of `WorkflowCondition` objects, each specifying a `field` (supporting dot notation for nested properties), an `operator` (e.g., `EQUALS`, `GREATER_THAN`, `CONTAINS`), and a `value`.
-   **Payload-Agnostic:** The evaluator is designed to work with any JavaScript object as a `payload`, making it highly versatile for evaluating conditions from different automation contexts (e.g., auto-assignment filters, escalation triggers).
-   **Comprehensive Operators:** It supports a wide range of logical and comparison operators, allowing for expressive and flexible rule definitions.
-   **Implicit AND Logic:** When multiple conditions are provided in the array, the `checkConditions` method applies implicit `AND` logic, meaning all conditions must evaluate to `true` for the overall check to pass.

### Reusability
The `ConditionEvaluator` is explicitly noted as being adapted from `api-workflows`, underscoring its role as a cross-service reusable component for defining and evaluating dynamic rules across the Verichron platform.

---

## 6. Events

This module is a helper utility and does not publish or subscribe to any events on the message bus.

---

## 7. Dependencies & Integrations

### External Dependencies
-   **`@verichron/contracts`:** For the `WorkflowCondition` interface, which defines the structure of the conditions that the evaluator processes.
-   **`@verichron/enums`:** For the `WorkflowConditionOperator` enum, which defines the supported comparison operators.

---

## 8. Gaps & Future Work

-   **Advanced Logical Operators:** The current `checkConditions` method only supports `AND` logic for multiple conditions. Future enhancements could introduce support for `OR` logic, nested condition groups, or more complex boolean expressions to enable more sophisticated rule definitions.
-   **Custom Functions/Expressions:** While flexible, the evaluator is limited to predefined operators. Extending it to support custom functions or JavaScript-like expressions within conditions could further enhance its power for highly specialized rule evaluation.
