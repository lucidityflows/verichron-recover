# API Workflows (Rules Engine & Workflow Orchestrator)

## 📖 Overview

The api-workflows microservice is the **rules engine** for the debt collection platform. It is responsible for defining workflow rules, auto-assignment configurations, escalation rules, and managing the state of automated collection strategies.

Unlike other services that manage state (e.g., api-debts stores debt balances), api-workflows manages **process definitions**. It listens for business events across the platform and issues **Commands** to other services to execute actions.

### Key Architecture Principle

- **api-workflows** = Rules Engine (defines WHAT to automate, WHEN to trigger)
- **api-automations** = Execution Engine (executes HOW to automate, queries data)

api-workflows does NOT directly execute automation logic or query cross-service data. Instead, it publishes commands to api-automations, which handles execution using the event-orchestrator for data queries.

## 🚀 Implementation Status

**Phase 1: Event-Driven Automation (COMPLETED)**
- ✅ Auto-assignment command publishing
- ✅ Escalation command publishing
- ✅ Result event tracking (success/failure feedback loops)
- ✅ Auto-disable logic for failed auto-assignments
- ✅ Cooldown period tracking for escalations
- ✅ Correlation ID support for idempotency
- ✅ Rate limiting (100 assignments/org/minute)
- ✅ Delayed execution via scheduler

**Ready for UI Integration:** All CRUD endpoints, DTOs, and event listeners are implemented and functional.

🎯 Bounded Context Responsibilities

**Workflow Definition:** Storing the rules and steps for various collection strategies (e.g., "Standard Dunning," "High-Risk Acceleration").

**Auto-Assignment Configuration:** Defining automatic collector assignment rules with strategies (round-robin, least-workload, skill-based, geographic).

**Escalation Rules:** Defining when and how to escalate issues to managers with multi-channel notifications.

**Saga Orchestration:** Managing long-running processes that span days or weeks (e.g., waiting 3 days after an email before sending an SMS).

**Event Reaction:** Listening to domain events (DEBT_CREATED, PAYMENT_MISSED) to trigger or transition workflows.

**Command Issuance:** Publishing commands to:
- **api-automations** (Execute Auto-Assignment, Execute Escalation)
- **api-communications** (Send Email, Send SMS)
- **api-collectors** (Create Task)

**Scheduler:** Managing time-based triggers (e.g., "Day 7 Action", scheduled auto-assignments).

🏗 Architecture & Modules

1. src/workflows

Core logic for defining and instantiating workflows.

Entities:

WorkflowDefinition: The template (JSON/YAML) defining steps, triggers, and rules.

WorkflowInstance: A running instance of a workflow linked to a specific debtId or debtorId.

StepExecution: The state of a specific step (Pending, Completed, Failed).

2. src/engine

The execution engine that processes steps.

Logic: Evaluates conditions (e.g., "Is LTPScore > 80?") and determines the next step.

State Machine: Transitions instances from ACTIVE -> PAUSED (e.g., waiting for payment) -> COMPLETED.

3. src/scheduler

Distributed cron/timer handling.

**Responsibility:**
- Wakes up workflows that are "sleeping" (e.g., "Wait 3 Days")
- Triggers scheduled auto-assignments by publishing commands to api-automations
- Triggers scheduled escalation checks by publishing commands to api-automations

**Tech:** Uses BullMQ with Redis for reliable delayed execution.

**Important:** The scheduler does NOT execute automation logic directly. It publishes commands to api-automations, which handles execution.

4. src/events (Listeners)

Consumes events from the event bus to drive workflow transitions and automation triggers.

**Workflow Engine Listeners:**
- `DebtCreatedListener`: Triggers the creation of a new WorkflowInstance (e.g., assigns "Day 1 Dunning")
- `PaymentReceivedListener`: Pauses or cancels active collection workflows for that debt
- `PromiseBrokenListener`: Triggers an escalation workflow (e.g., "Urgent Call Task")

**Auto-Assignment Listeners:**
- `AutoAssignmentTriggerListener`: Listens to `DEBTS_DEBT_CREATED` and triggers auto-assignment execution
- `AutoAssignmentResultListener`: Listens to `AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED/FAILED` to track success/failure and implement auto-disable logic

**Escalation Listeners:**
- `EscalationTriggerListener`: Listens to `TRANSACTIONS_PROMISE_BROKEN` and `DEBTS_DEBT_UPDATED` to trigger escalations
- `EscalationResultListener`: Listens to `AUTOMATIONS_ESCALATION_COMPLETED/FAILED` to track execution counts

5. src/auto-assignment

Auto-assignment configuration management with automatic failure handling.

**Entities:**
- `AutoAssignmentConfig`: Configuration for automatic collector assignment
  - Strategies: ROUND_ROBIN, LEAST_WORKLOAD, SKILL_BASED, GEOGRAPHIC
  - Filters: Portfolio, balance range, account age, priority
  - **New Fields:**
    - `consecutiveFailures`: Tracks failure count for auto-disable logic
    - `autoDisabled`: Automatically disabled after 5 consecutive failures
    - `autoDisabledAt`: Timestamp when auto-disabled
    - `autoDisabledReason`: Reason for auto-disable (includes last error)
    - `delayMinutes`: Optional delay before executing assignment

**Services:**
- `AutoAssignmentService`: CRUD operations for configs
- `AutoAssignmentExecutorService`: Handles execution logic
  - Rate limiting (100 assignments/org/minute)
  - Filter validation
  - Delayed execution scheduling
  - Command publishing to api-automations

**Execution Flow:**
1. Event triggers listener (`DEBTS_DEBT_CREATED`)
2. Find all enabled configs for organization
3. Validate filters and rate limits
4. Schedule delayed execution OR publish command immediately
5. api-automations executes and publishes result event
6. Result listener updates failure count / re-enables config on success

6. src/escalation-rules

Escalation rule configuration management with cooldown-based deduplication.

**Entities:**
- `EscalationRule`: Configuration for automatic issue escalation
  - Notification Methods: EMAIL, SMS, IN_APP
  - Escalation Targets: Manager, senior collector, custom role
  - **New Fields:**
    - `cooldownHours`: Minimum hours between escalations (default: 24)
    - `executionCount`: Tracks total escalations for analytics

- `EscalationExecution`: Deduplication tracking entity
  - Records each escalation execution with timestamp
  - Prevents duplicate escalations within cooldown period
  - Composite index on (organizationId, ruleId, targetEntityId, executedAt)

**Services:**
- `EscalationRulesService`: CRUD operations for rules
- `EscalationExecutorService`: Handles execution logic
  - Cooldown period checking (prevents spam)
  - Condition evaluation (full operator support: EQUALS, GREATER_THAN, CONTAINS, BETWEEN, IN, etc.)
  - Execution tracking for deduplication
  - Command publishing to api-automations

**Execution Flow:**
1. Event triggers listener (`TRANSACTIONS_PROMISE_BROKEN`, `DEBTS_DEBT_UPDATED`)
2. Find all enabled escalation rules
3. Check cooldown period (skip if executed recently)
4. Evaluate trigger conditions
5. Publish escalation command to api-automations
6. Record execution timestamp for deduplication
7. api-automations executes and publishes result event
8. Result listener updates execution count

7. src/commands (Publishers)

Issues commands to other services. This service does not send emails directly; it commands other services to execute actions.

**Commands Published:**
- To api-automations: `AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT`, `AUTOMATIONS_EXECUTE_SCHEDULED_AUTO_ASSIGNMENT`, `AUTOMATIONS_EXECUTE_ESCALATION`
- To api-communications: `COMMUNICATION_SEND_EMAIL`, `COMMUNICATION_SEND_SMS`
- To api-collectors: `COLLECTOR_CREATE_CALL_TASK`

🔌 API Endpoints (Internal & Manager UI)

Method

Endpoint

Description

POST

/workflows/definitions

Create/Update a collection strategy (Admin/Manager).

GET

/workflows/instances/{debtId}

Get the current automation state for a specific debt (for Debtor 360 View).

POST

/workflows/instances/{id}/skip

Manually skip a step (Manager override).

POST

/workflows/instances/{id}/pause

Pause automation (e.g., during a dispute).

## 📡 Event Integration

### Consumed Events (Trigger Automation)

**Workflow Engine Events:**
- `debts.debt.created` (`DEBTS_DEBT_CREATED`) - Triggers workflow instance creation
- `transactions.payment.received` (`TRANSACTIONS_PAYMENT_RECEIVED`) - Pauses/cancels active workflows
- `transactions.payment_plan.failed` (`TRANSACTIONS_PAYMENT_PLAN_FAILED`) - Triggers escalation workflows

**Auto-Assignment Triggers:**
- `debts.debt.created` (`DEBTS_DEBT_CREATED`) - Triggers auto-assignment evaluation for new debts

**Escalation Triggers:**
- `transactions.promise.broken` (`TRANSACTIONS_PROMISE_BROKEN`) - Triggers escalation when payment promises are broken
- `debts.debt.updated` (`DEBTS_DEBT_UPDATED`) - Triggers escalation for high-balance accounts

**Result Events (Feedback Loops):**
- `automations.auto_assignment.completed` (`AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED`) - Resets failure counter on success
- `automations.auto_assignment.failed` (`AUTOMATIONS_AUTO_ASSIGNMENT_FAILED`) - Increments failure counter, auto-disables after 5 failures
- `automations.escalation.completed` (`AUTOMATIONS_ESCALATION_COMPLETED`) - Updates execution count for analytics
- `automations.escalation.failed` (`AUTOMATIONS_ESCALATION_FAILED`) - Logs failure for manual review

### Published Commands (To api-automations)

**Auto-Assignment Commands:**
- `automations.execute_auto_assignment` (`AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT`)
  - Published when: New debt created, filters match, no delay configured
  - Payload: organizationId, configId, strategy, filters, collectorPool, targetEntityId, targetEntityType, targetEntityData, correlationId

**Escalation Commands:**
- `automations.execute_escalation` (`AUTOMATIONS_EXECUTE_ESCALATION`)
  - Published when: Trigger event occurs, cooldown period passed, conditions met
  - Payload: organizationId, ruleId, ruleName, triggerConditions, escalateTo, escalationTargets, notificationMethods, priority, targetEntityId, targetEntityType, targetEntityData, correlationId

### Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Business Events (debts.debt.created, transactions.promise.broken)│
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ api-workflows (Event Listeners)                                  │
│  • AutoAssignmentTriggerListener                                 │
│  • EscalationTriggerListener                                     │
│  • DebtCreatedListener                                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Executor Services (Validation & Command Publishing)             │
│  • Check rate limits, filters, cooldown periods                 │
│  • Evaluate conditions                                           │
│  • Publish commands to api-automations                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ api-automations (Execution Engine)                              │
│  • Query data via event-orchestrator                            │
│  • Execute assignment strategies                                │
│  • Send notifications                                            │
│  • Publish result events                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ api-workflows (Result Listeners)                                 │
│  • AutoAssignmentResultListener → Update failure count          │
│  • EscalationResultListener → Update execution count            │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Key Features & Design Decisions

### Auto-Disable Logic (Prevents Infinite Failure Loops)
- Tracks consecutive failures per auto-assignment config
- Automatically disables config after 5 consecutive failures
- Stores timestamp and reason for troubleshooting
- Re-enables automatically on first success
- Prevents runaway automation from wasting resources

### Cooldown-Based Deduplication (Prevents Escalation Spam)
- Records each escalation execution with timestamp
- Prevents duplicate escalations within configurable cooldown period (default: 24 hours)
- Uses efficient database queries with composite index
- Skips execution with clear logging when within cooldown

### Rate Limiting (Prevents Overload)
- Limits auto-assignments to 100 per organization per minute
- Uses in-memory sliding window (60-second lookups)
- Protects downstream services from spike traffic
- Graceful degradation with clear error messages

### Correlation ID Tracking (Enables Idempotency)
- Every command includes correlation ID for request tracing
- Enables duplicate detection in api-automations
- Supports distributed debugging across services
- Added to WorkflowExecution entity for audit trail

### Delayed Execution (Supports Business Logic)
- Optional `delayMinutes` field on auto-assignment configs
- Uses BullMQ scheduler for reliable delayed jobs
- Allows "wait and see" strategies (e.g., assign after 24h if no payment)
- Scheduler publishes commands at scheduled time

### Condition Evaluation Engine
- Full operator support: EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN, GREATER_THAN_OR_EQUAL, LESS_THAN_OR_EQUAL, CONTAINS, NOT_CONTAINS, BETWEEN, IN, NOT_IN
- Supports nested field access (e.g., `debtor.contact.phone`)
- Type-safe evaluation with explicit type checking
- Fails gracefully with detailed logging

### Continue-on-Failure Pattern
- When multiple rules/configs match, execution continues even if one fails
- Each rule/config is isolated in try-catch block
- Prevents one bad config from blocking all automation
- Comprehensive error logging for debugging

## 🛠 Tech Stack

**Framework:** NestJS

**Database:** PostgreSQL (for state persistence - workflow definitions, rules, configs)

**Queue:** BullMQ with Redis (for scheduling and delayed job execution)

**Event Bus:** GCP Pub/Sub (for event-driven communication)

**Related Services:**
- **api-automations** - Automation execution engine
- **api-communications** - Communication dispatch
- **api-collectors** - Work queue and collector management

---

## 🏛️ Architecture

```
┌─────────────────┐
│  Event Bus      │  Business events (debt.created, payment.received, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ api-workflows   │  Rules Engine
│                 │
│ • Workflow Rules│  Evaluates triggers, defines automation rules
│ • Auto-Assign   │  Configures assignment strategies
│ • Escalations   │  Configures escalation rules
│ • Scheduler     │  Manages time-based triggers
└────────┬────────┘
         │ Publishes Commands
         ▼
┌─────────────────┐
│ api-automations │  Execution Engine
│                 │
│ • Query Data    │  Uses event-orchestrator for cross-service queries
│ • Execute Logic │  Runs assignment strategies, escalation logic
│ • Publish Events│  Sends results back to api-workflows
└─────────────────┘
```

**Design Principle:** api-workflows defines the "what" and "when" of automation. api-automations handles the "how" and data queries.

---

## 🔌 API Endpoints for UI Integration

### Auto-Assignment
- `GET /auto-assignment` - List all auto-assignment configs (supports pagination, filtering)
- `POST /auto-assignment` - Create new auto-assignment config
- `GET /auto-assignment/:id` - Get single config by ID
- `PATCH /auto-assignment/:id` - Update config
- `DELETE /auto-assignment/:id` - Delete config
- `PATCH /auto-assignment/:id/toggle` - Enable/disable config

**New DTO Fields (exposed to UI):**
- `consecutiveFailures` (read-only) - Shows failure count
- `autoDisabled` (read-only) - Shows if auto-disabled
- `autoDisabledAt` (read-only) - Timestamp of auto-disable
- `autoDisabledReason` (read-only) - Reason for auto-disable
- `delayMinutes` (read-write) - Optional delay before execution

### Escalation Rules
- `GET /escalation-rules` - List all escalation rules
- `POST /escalation-rules` - Create new escalation rule
- `GET /escalation-rules/:id` - Get single rule by ID
- `PATCH /escalation-rules/:id` - Update rule
- `DELETE /escalation-rules/:id` - Delete rule
- `PATCH /escalation-rules/:id/toggle` - Enable/disable rule

**New DTO Fields (exposed to UI):**
- `cooldownHours` (read-write) - Cooldown period in hours (default: 24)
- `executionCount` (read-only) - Total executions for analytics

### Workflow Executions (History)
- `GET /workflow-executions` - List execution history with filters
  - Query params: `ruleId`, `status`, `startDate`, `endDate`, `limit`
- `GET /workflow-executions/:id` - Get detailed execution record

**New DTO Fields (exposed to UI):**
- `correlationId` (read-only) - For request tracing

### Workflow Analytics
- `GET /workflow-analytics` - Get comprehensive analytics
  - Returns: totalRules, activeRules, totalExecutions, successRate, topPerformingRules, executionsByDay

### Workflow Templates
- `GET /workflow-templates` - Get pre-built workflow templates
- `GET /workflow-templates/:id` - Get specific template

**All endpoints require authentication and organization context.**

---

## 🚦 Next Steps for UI Integration

### 1. Generate OpenAPI Specs
```bash
npm run build
# OpenAPI spec will be available at http://localhost:3000/api-docs
```

### 2. Update Orval Configuration
Add api-workflows to Orval config to generate TypeScript client:
```typescript
{
  "api-workflows": {
    "input": "http://localhost:3000/api-docs-json",
    "output": "apps/ui-organization/src/api/workflows"
  }
}
```

### 3. Update UI Service Layer
The UI's `workflowService.ts` currently uses mock data. Replace with Orval-generated API calls:
- `getAutoAssignmentConfigs()` → Use generated `getAutoAssignment()`
- `createAutoAssignmentConfig()` → Use generated `createAutoAssignment()`
- `getEscalationRules()` → Use generated `getEscalationRules()`
- etc.

### 4. Handle New Fields in UI
Update UI components to display/edit new fields:
- Show `autoDisabled` status with warning badge
- Display `autoDisabledReason` in tooltip/modal
- Show `consecutiveFailures` count
- Add `cooldownHours` input field (default: 24)
- Add `delayMinutes` input field for delayed assignments

### 5. Test Event Flow (End-to-End)
1. Create auto-assignment config via UI
2. Trigger `DEBTS_DEBT_CREATED` event (create a debt)
3. Verify command published to api-automations
4. Verify result event received and failure count updated
5. Test auto-disable by forcing 5 failures

**Design Principle:** api-workflows defines the "what" and "when" of automation. api-automations handles the "how" and data queries.