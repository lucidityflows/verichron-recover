# Unit & Integration Testing Philosophy: api-communications

This document outlines the testing strategy and system rules for the `api-communications` microservice.

## 1. Core Principles
- **Documentation First**: All tests must document the system rule they prove.
- **Deliberate & Meaningful**: Tests must validate specific business logic and edge cases.

## 2. Two-Tier Testing Strategy
- **Unit Tests**: Test classes in isolation with mocked dependencies.
- **Integration Tests**: Test module request pipelines using an in-memory NestJS server.

---

## 3. Documented System Rules for `api-communications`

This section lists the core system rules for `api-communications` that our tests will prove.

### DISPATCH: Communication Dispatch Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-C-DISP-001** | `dispatchCommunication` must select the correct gateway (Email/SMS) based on the communication type. | `dispatch.service.spec.ts` | ✅ Implemented |
| **R-C-DISP-002** | `dispatchCommunication` must check compliance rules before sending. | `dispatch.service.spec.ts` | ✅ Implemented |

### TEMPLATES: Template Management Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-C-TMPL-001** | `renderTemplate` must correctly inject variables into a template body. | `templates.service.spec.ts` | ❌ Not Implemented |

### COMPLIANCE: FDCPA/TCPA Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-C-COMP-001** | The compliance service must block communications outside of allowed hours. | `compliance.service.spec.ts` | ✅ Implemented |

### EVENTS: Event Listener Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-C-EVNT-001** | The service must correctly listen for `PAYMENT_REMINDER` events and trigger the dispatch process. | `*.listener.spec.ts` | ❌ Not Implemented |

### CORE: Guards and Core Logic Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-C-CORE-001** | `OrgContextGuard` should correctly initialize and be defined. | `org-context.guard.spec.ts` | ❌ Not Implemented (Spec file missing from microservice suite) |

---

## 4. Test Coverage & Status

*This section will be populated as tests are implemented.*
