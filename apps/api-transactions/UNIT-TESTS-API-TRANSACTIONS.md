# Unit & Integration Testing Philosophy: api-transactions

This document outlines the testing strategy and system rules for the `api-transactions` microservice.

## 1. Core Principles
- **Documentation First**: All tests must document the system rule they prove.
- **Deliberate & Meaningful**: Tests must validate specific business logic and edge cases.

## 2. Two-Tier Testing Strategy
- **Unit Tests**: Test classes in isolation with mocked dependencies.
- **Integration Tests**: Test module request pipelines using an in-memory NestJS server.

---

## 3. Documented System Rules for `api-transactions`

This section lists the core system rules for `api-transactions` that our tests will prove.

### TRANSACTIONS: Payment Transaction Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-T-TRAN-001** | `createTransaction` must correctly record a payment against a debt and interact with the payment gateway. | `transactions.service.spec.ts` | ⏳ Pending |
| **R-T-TRAN-002** | `listTransactions` must be correctly scoped to the user's organization. | `transactions.controller.spec.ts` | ⏳ Pending |

### PAYMENT PLANS: Payment Plan Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-T-PLAN-001** | `createPaymentPlan` must create a valid plan with a series of scheduled transactions. | `payment-plans.service.spec.ts` | ⏳ Pending |
| **R-T-PLAN-002** | `cancelPaymentPlan` can only be performed by users with `payment_plan:cancel` permission. | `payment-plans.controller.spec.ts` | ⏳ Pending |

### GATEWAYS: Payment Gateway Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-T-GATE-001** | The `StripeGateway` must correctly create payment intents and handle webhooks. | `stripe.gateway.spec.ts` | ⏳ Pending |

### CORE: Guards and Core Logic Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-T-CORE-001** | `JwtAuthGuard` must successfully validate a JWT and reject invalid ones. | `jwt.guard.spec.ts` | ⏳ Pending |
| **R-T-CORE-002** | `OrgContextGuard` must correctly enforce organization data isolation for transactions. | `org-context.guard.spec.ts` | ⏳ Pending |

---

## 4. Test Coverage & Status

*This section will be populated as tests are implemented.*
