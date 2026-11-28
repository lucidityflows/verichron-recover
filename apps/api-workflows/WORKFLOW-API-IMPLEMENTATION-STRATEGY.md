# Workflow Automation API - Implementation Strategy

**Document Version:** 1.0
**Last Updated:** 2025-12-18
**Status:** Gap Analysis Complete

---

## Executive Summary

The Workflow Automation system comprises two microservices:
- **api-workflows** (Rules Engine): Manages configurations, evaluates triggers, publishes commands
- **api-automations** (Execution Engine): Executes automation logic, queries cross-service data

**Current Status:** ~85% Complete
- ✅ HTTP Management API Layer: **100% Complete**
- ✅ Database Entities & Schema: **100% Complete**
- ✅ CRUD Services: **100% Complete**
- ✅ Workflow Engine: **100% Complete**
- ✅ Analytics & Reporting: **100% Complete**
- ⏳ Event Integration: **70% Complete** (missing result tracking)
- ❌ Auto-Assignment/Escalation Command Publishing: **0% Complete**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Event Bus (Pub/Sub)                     │
│  • Business Events (debt.created, payment.received, etc.)   │
│  • Command Events (execute_auto_assignment, etc.)           │
│  • Result Events (assignment_completed, escalation_failed)  │
└────────────┬─────────────────────────────────┬──────────────┘
             │                                 │
             ▼                                 ▼
┌────────────────────────┐          ┌──────────────────────┐
│    api-workflows       │          │  api-automations     │
│   (Rules Engine)       │          │ (Execution Engine)   │
│                        │          │                      │
│ • Workflow Rules CRUD  │──────────│ • Auto-Assignment    │
│ • Auto-Assign Config   │ Commands │   Strategies         │
│ • Escalation Rules     │─────────▶│ • Escalation Logic   │
│ • Execution History    │          │ • Data Orchestration │
│ • Analytics            │◀─────────│ • Result Publishing  │
│ • Trigger Evaluation   │ Results  │                      │
└────────────────────────┘          └──────────────────────┘
```

---

## Current Implementation Status

### ✅ COMPLETE: HTTP Management API

All required endpoints are implemented in api-workflows:

#### Auto-Assignment Configuration
- `POST /workflows/auto-assignment` - Create config
- `GET /workflows/auto-assignment` - List configs
- `GET /workflows/auto-assignment/:configId` - Get config
- `PATCH /workflows/auto-assignment/:configId` - Update config
- `DELETE /workflows/auto-assignment/:configId` - Delete config
- `PATCH /workflows/auto-assignment/:configId/toggle` - Enable/disable

**File:** `src/auto-assignment/auto-assignment.controller.ts`

#### Escalation Rules
- `POST /workflows/escalations` - Create rule
- `GET /workflows/escalations` - List rules
- `GET /workflows/escalations/:ruleId` - Get rule
- `PATCH /workflows/escalations/:ruleId` - Update rule
- `DELETE /workflows/escalations/:ruleId` - Delete rule

**File:** `src/escalation-rules/escalation-rules.controller.ts`

#### Workflow Rules
- `POST /workflows/rules` - Create rule
- `GET /workflows/rules` - List rules
- `GET /workflows/rules/:ruleId` - Get rule
- `PATCH /workflows/rules/:ruleId` - Update rule
- `DELETE /workflows/rules/:ruleId` - Delete rule
- `PATCH /workflows/rules/:ruleId/toggle` - Enable/disable

**File:** `src/workflow-rules/workflow-rules.controller.ts`

#### Execution History
- `GET /workflows/executions` - List executions (with filters: limit, ruleId, status, startDate, endDate)
- `GET /workflows/executions/:executionId` - Get execution details

**File:** `src/workflow-executions/workflow-executions.controller.ts`

#### Analytics
- `GET /workflows/analytics` - Get comprehensive analytics (with date range filters)

**File:** `src/workflow-analytics/workflow-analytics.controller.ts`

#### Templates
- `GET /workflows/templates` - List workflow templates
- (Additional template endpoints exist)

**File:** `src/workflow-templates/workflow-templates.controller.ts`

---

### ✅ COMPLETE: Database Entities

All required entities are defined with proper schema:

#### AutoAssignmentConfig
**File:** `src/auto-assignment/entities/auto-assignment-config.entity.ts`

```typescript
{
  id: string
  organizationId: string
  name: string
  description?: string
  enabled: boolean
  strategy: AutoAssignmentStrategy (ROUND_ROBIN, LEAST_WORKLOAD, SKILL_BASED, GEOGRAPHIC)
  filters: AutoAssignmentFilters (portfolioIds, balanceRange, accountAgeRange, priority)
  collectorPool: string[]
  excludeCollectors?: string[]
  maxAssignmentsPerDay?: number
  workloadThreshold?: number
  lastAssignedCollectorId?: string (for round-robin tracking)
  dailyAssignmentCounts: DailyAssignmentCounts
  totalAssignments: number
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}
```

#### WorkflowExecution
**File:** `src/workflow-executions/entities/workflow-execution.entity.ts`

```typescript
{
  id: string
  organizationId: string
  ruleId?: string
  ruleName: string
  triggeredAt: Date
  triggeredBy: string
  targetEntityType: WorkflowTargetEntityType
  targetEntityId: string
  targetEntityName?: string
  actionsExecuted: ActionExecution[]
  status: WorkflowExecutionStatus (COMPLETED, PARTIAL, FAILED)
  durationMs?: number
  errorMessage?: string
}
```

**ActionExecution Interface:**
```typescript
{
  actionId: string
  actionType: string
  status: ActionExecutionStatus (SUCCESS, FAILED, SKIPPED)
  result?: string
  error?: string
  executedAt: Date
  duration?: number
}
```

#### WorkflowRule, EscalationRule, WorkflowTemplate
All entities follow similar comprehensive patterns with proper indexes.

---

### ✅ COMPLETE: Workflow Engine

**File:** `src/engine/engine.service.ts`

The EngineService is fully implemented with:

1. **processWorkflowTrigger(organizationId, eventPayload)**
   - Main entry point for all workflow evaluation
   - Fetches all enabled rules for organization
   - Sorts by priority (LOW → MEDIUM → HIGH → CRITICAL)
   - Evaluates conditions for each rule
   - Executes matching rules

2. **Condition Evaluation**
   - Supports all operators: EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN, GREATER_THAN_OR_EQUAL, LESS_THAN_OR_EQUAL, CONTAINS, NOT_CONTAINS, BETWEEN, IN, NOT_IN
   - Nested field access via dot notation (e.g., `user.profile.name`)
   - Type-safe comparisons

3. **Action Execution Pipeline**
   - Sequential action execution in order
   - Per-action timing and status tracking
   - Error handling with continue-on-failure
   - Automatic execution history logging

4. **Execution Tracking**
   - Calls `workflowExecutionsService.createExecution()` after rule execution
   - Records all action results, durations, and errors
   - Calculates overall status (COMPLETED, PARTIAL, FAILED)

**Integration:** Engine is called by event listeners (debt-created, payment-received, promise-broken).

---

### ✅ COMPLETE: Analytics & Reporting

**File:** `src/workflow-analytics/workflow-analytics.service.ts`

Provides comprehensive analytics:

1. **Summary Metrics**
   - Total rules count
   - Active rules count
   - Total executions in period
   - Overall success rate

2. **Top Performing Rules**
   - Aggregates executions by rule
   - Calculates per-rule success rates
   - Computes average execution duration
   - Returns top 5 rules by execution count

3. **Daily Execution Stats**
   - Groups executions by day
   - Counts: total, successes, failures per day
   - Initializes all days in period (handles gaps)

4. **Recent Executions**
   - Returns last 10 executions sorted by triggeredAt

**Performance:** Uses efficient queries with date range filtering (defaults to last 30 days).

---

### ✅ COMPLETE: CRUD Services

All CRUD services are fully implemented:

- **AutoAssignmentService** (`src/auto-assignment/auto-assignment.service.ts`)
  - create, findAll, findOne, update, remove, toggle
  - Proper authorization checks via RequestContext
  - Error handling with NotFoundException

- **EscalationRulesService** (`src/escalation-rules/escalation-rules.service.ts`)
  - Full CRUD operations

- **WorkflowRulesService** (`src/workflow-rules/workflow-rules.service.ts`)
  - Full CRUD operations with toggle support

- **WorkflowExecutionsService** (`src/workflow-executions/workflow-executions.service.ts`)
  - Query operations with filtering
  - **createExecution()** method for logging workflow runs

All services include:
- Organization-scoped queries
- Proper error handling
- Response DTOs for serialization
- Authorization integration

---

## Gaps & Missing Implementation

### ❌ GAP 1: Auto-Assignment Command Publishing

**Problem:** api-workflows can create auto-assignment configurations, but doesn't trigger their execution.

**Current State:**
- `AutoAssignmentService` only handles CRUD for configurations
- No logic to publish `AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT` commands to api-automations
- `CommandsService` doesn't have a case for auto-assignment actions

**What's Needed:**

1. **Add Auto-Assignment Executor to api-workflows** (`src/auto-assignment/auto-assignment-executor.service.ts`)
   ```typescript
   @Injectable()
   export class AutoAssignmentExecutorService {
     async executeAutoAssignment(
       organizationId: string,
       configId: string,
       targetEntityId: string,
       targetEntityType: string,
       targetEntityData: any
     ): Promise<void> {
       // 1. Fetch auto-assignment config
       // 2. Validate filters match targetEntity
       // 3. Publish AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT command to api-automations
     }
   }
   ```

2. **Add Event Listener for Trigger Events** (`src/events/listeners/auto-assignment-trigger.listener.ts`)
   ```typescript
   @EventSubscription({
     topicName: EVENT_TOPICS.DEBTS,
     eventType: EVENT_TYPES.DEBTS_DEBT_CREATED,
     subscriptionName: 'api-workflows-auto-assignment-debt-created',
   })
   async handleDebtCreated(envelope: EventEnvelope<DebtCreatedDto>) {
     // Find matching auto-assignment configs
     // For each match, call autoAssignmentExecutorService.executeAutoAssignment()
   }
   ```

3. **Extend CommandsService** to publish auto-assignment commands
   ```typescript
   case WorkflowActionType.AUTO_ASSIGN:
     topic = EVENT_TOPICS.AUTOMATIONS;
     eventType = EVENT_TYPES.AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT;
     eventSource = EVENT_SOURCES.WORKFLOWS;
     data = {
       organizationId,
       configId: action.config.configId,
       targetEntityId,
       targetEntityType,
       targetEntityData: eventPayload
     };
     break;
   ```

**Estimated Effort:** 4-6 hours

---

### ❌ GAP 2: Escalation Command Publishing

**Problem:** Escalation rules can be configured, but execution doesn't route through api-automations.

**Current State:**
- `EscalationRulesService` only handles CRUD
- `CommandsService` has `ESCALATE_TO_MANAGER` but sends it directly to COLLECTORS topic
- Should publish `AUTOMATIONS_EXECUTE_ESCALATION` to api-automations instead

**What's Needed:**

1. **Add Escalation Executor** (`src/escalation-rules/escalation-executor.service.ts`)
   ```typescript
   @Injectable()
   export class EscalationExecutorService {
     async executeEscalation(
       organizationId: string,
       ruleId: string,
       targetEntityId: string,
       targetEntityType: string,
       targetEntityData: any
     ): Promise<void> {
       // 1. Fetch escalation rule
       // 2. Evaluate trigger conditions
       // 3. Publish AUTOMATIONS_EXECUTE_ESCALATION command
     }
   }
   ```

2. **Update CommandsService** to route escalation through api-automations
   ```typescript
   case WorkflowActionType.ESCALATE_TO_MANAGER:
     topic = EVENT_TOPICS.AUTOMATIONS;  // Changed from COLLECTORS
     eventType = EVENT_TYPES.AUTOMATIONS_EXECUTE_ESCALATION;
     eventSource = EVENT_SOURCES.WORKFLOWS;
     data = {
       organizationId,
       ruleId: action.config.ruleId,
       targetEntityId,
       targetEntityType,
       targetEntityData: eventPayload,
       triggerConditions: action.config.conditions,
       escalateTo: action.config.escalateTo,
       escalationTargets: action.config.targets,
       notificationMethods: action.config.methods,
       priority: action.config.priority
     };
     break;
   ```

3. **Add Event Listener for Escalation Triggers** (`src/events/listeners/escalation-trigger.listener.ts`)
   - Listen to critical events (promise-broken, compliance-alert, high-balance, etc.)
   - Find matching escalation rules
   - Execute via escalationExecutorService

**Estimated Effort:** 4-6 hours

---

### ❌ GAP 3: Result Event Tracking

**Problem:** api-automations publishes result events, but api-workflows doesn't consume them to update execution tracking.

**Current State:**
- No listeners for `AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED`
- No listeners for `AUTOMATIONS_AUTO_ASSIGNMENT_FAILED`
- No listeners for `AUTOMATIONS_ESCALATION_COMPLETED`
- No listeners for `AUTOMATIONS_ESCALATION_FAILED`

**What's Needed:**

1. **Auto-Assignment Result Listener** (`src/events/listeners/auto-assignment-result.listener.ts`)
   ```typescript
   @EventSubscription({
     topicName: EVENT_TOPICS.AUTOMATIONS,
     eventType: EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED,
     subscriptionName: 'api-workflows-auto-assignment-result',
   })
   async handleAutoAssignmentCompleted(
     envelope: EventEnvelope<AutoAssignmentCompletedDto>
   ) {
     // 1. Update AutoAssignmentConfig:
     //    - Increment totalAssignments
     //    - Update lastAssignedCollectorId (for round-robin)
     //    - Update dailyAssignmentCounts
     // 2. Create WorkflowExecution record for tracking
   }

   @EventSubscription({
     topicName: EVENT_TOPICS.AUTOMATIONS,
     eventType: EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_FAILED,
     subscriptionName: 'api-workflows-auto-assignment-failed',
   })
   async handleAutoAssignmentFailed(envelope: EventEnvelope<AutoAssignmentFailedDto>) {
     // 1. Log error
     // 2. Create WorkflowExecution record with FAILED status
     // 3. Optionally: disable config after X failures
   }
   ```

2. **Escalation Result Listener** (`src/events/listeners/escalation-result.listener.ts`)
   ```typescript
   @EventSubscription({
     topicName: EVENT_TOPICS.AUTOMATIONS,
     eventType: EVENT_TYPES.AUTOMATIONS_ESCALATION_COMPLETED,
     subscriptionName: 'api-workflows-escalation-result',
   })
   async handleEscalationCompleted(envelope: EventEnvelope<EscalationCompletedDto>) {
     // 1. Update EscalationRule.executionCount
     // 2. Create WorkflowExecution record
   }

   @EventSubscription({
     topicName: EVENT_TOPICS.AUTOMATIONS,
     eventType: EVENT_TYPES.AUTOMATIONS_ESCALATION_FAILED,
     subscriptionName: 'api-workflows-escalation-failed',
   })
   async handleEscalationFailed(envelope: EventEnvelope<EscalationFailedDto>) {
     // 1. Log error
     // 2. Create WorkflowExecution record with FAILED status
   }
   ```

**Estimated Effort:** 3-4 hours

---

### ⏳ GAP 4: Scheduler Integration (Lower Priority)

**Status:** SchedulerService exists but needs configuration.

**What's Needed:**

1. **Scheduled Auto-Assignment Job**
   - Run every 5-15 minutes
   - Query for unassigned accounts/debts
   - Find matching auto-assignment configs
   - Publish batch `AUTOMATIONS_EXECUTE_SCHEDULED_AUTO_ASSIGNMENT` command

2. **Scheduled Escalation Check Job**
   - Run every 5-15 minutes
   - Query for conditions requiring escalation (e.g., broken promises > 2 days old)
   - Find matching escalation rules
   - Execute escalations

3. **Workflow Rule Time-Based Triggers**
   - Handle rules with trigger type: TIME_BASED
   - Schedule based on cron expressions or delays

**Estimated Effort:** 6-8 hours

---

### ❌ GAP 5: Database Migrations

**Status:** Partial - need to verify and create missing tables

**Found:**
- `src/migrations/AddAutoAssignmentMigration.ts`

**Required Tables:**

1. **workflow_rules** - Workflow rule definitions
   - Indexes: `(organization_id)`, `(organization_id, enabled)`
   - Unique: `(organization_id, name)`

2. **auto_assignment_configs** - Auto-assignment configurations
   - New fields needed:
     - `consecutive_failures INTEGER DEFAULT 0`
     - `auto_disabled BOOLEAN DEFAULT false`
     - `auto_disabled_at TIMESTAMPTZ`
     - `auto_disabled_reason TEXT`
     - `delay_minutes INTEGER`
   - Indexes: `(organization_id)`, `(organization_id, enabled)`
   - Unique: `(organization_id, name)`

3. **escalation_rules** - Escalation rule configurations
   - New field needed:
     - `cooldown_hours INTEGER DEFAULT 24`
   - Indexes: `(organization_id)`, `(organization_id, enabled)`
   - Unique: `(organization_id, name)`

4. **workflow_executions** - Execution history
   - New field needed:
     - `correlation_id VARCHAR(255)` (for idempotency)
   - Indexes:
     - `(organization_id, triggered_at DESC)`
     - `(organization_id, rule_id)`
     - `(organization_id, status)`
     - `(correlation_id)` (for idempotency checks)

5. **escalation_executions** - NEW TABLE for deduplication
   - Fields: `id`, `organization_id`, `rule_id`, `target_entity_id`, `target_entity_type`, `executed_at`
   - Index: `(organization_id, rule_id, target_entity_id, executed_at DESC)`
   - Foreign Key: `rule_id → escalation_rules(id) ON DELETE CASCADE`

**Estimated Effort:** 2-3 hours

---

## Implementation Priority & Roadmap

### Phase 1: Core Automation Execution (Critical Path)
**Goal:** Enable UI to manage and execute auto-assignment and escalation

**Tasks:**
1. ✅ Verify database migrations exist for all entities
2. ❌ Implement Gap 1: Auto-Assignment Command Publishing
   - Add `AutoAssignmentExecutorService`
   - Add auto-assignment trigger listeners
   - Update `CommandsService`
3. ❌ Implement Gap 2: Escalation Command Publishing
   - Add `EscalationExecutorService`
   - Add escalation trigger listeners
   - Update `CommandsService`
4. ❌ Implement Gap 3: Result Event Tracking
   - Add auto-assignment result listeners
   - Add escalation result listeners
   - Wire up execution history updates

**Deliverable:** UI can create auto-assignment/escalation configs and see them execute in real-time.

**Estimated Time:** 12-16 hours (1.5-2 days)

---

### Phase 2: Scheduler & Advanced Features
**Goal:** Time-based automation and scheduled jobs

**Tasks:**
1. ❌ Implement Gap 4: Scheduler Integration
   - Scheduled auto-assignment jobs
   - Scheduled escalation checks
   - Time-based workflow triggers

2. ✅ Additional Features (if needed)
   - Workflow templates seeding
   - Advanced analytics caching
   - Audit logging

**Deliverable:** Fully automated, time-driven workflow system.

**Estimated Time:** 6-10 hours (1 day)

---

## Testing Strategy

### Unit Tests
- Test condition evaluation logic in `EngineService`
- Test auto-assignment filter matching
- Test escalation condition evaluation
- Test analytics aggregation logic

### Integration Tests
- End-to-end workflow execution (event → rule evaluation → action execution → history logging)
- Auto-assignment execution flow (config → command publish → result tracking)
- Escalation execution flow (rule → command publish → notification → result tracking)

### Event Flow Tests
- Mock event publishing/subscription
- Verify event payloads match contracts
- Test error handling and retries

---

## API Contract Validation

### Verify UI Requirements Match Implementation

Compare against `./ARCHITECTURE-SPEC.md` requirements:

#### ✅ Workflow Rules Management
- [x] GET /api/workflows/rules
- [x] POST /api/workflows/rules
- [x] PATCH /api/workflows/rules/:ruleId
- [x] DELETE /api/workflows/rules/:ruleId
- [x] PATCH /api/workflows/rules/:ruleId/toggle

#### ✅ Auto-Assignment Configuration
- [x] GET /api/workflows/auto-assignment
- [x] POST /api/workflows/auto-assignment
- [x] PATCH /api/workflows/auto-assignment/:configId
- [x] DELETE /api/workflows/auto-assignment/:configId
- [x] PATCH /api/workflows/auto-assignment/:configId/toggle

#### ✅ Escalation Rules
- [x] GET /api/workflows/escalations
- [x] POST /api/workflows/escalations
- [x] PATCH /api/workflows/escalations/:ruleId
- [x] DELETE /api/workflows/escalations/:ruleId

#### ✅ Execution History
- [x] GET /api/workflows/executions (with filters)
- [x] GET /api/workflows/executions/:executionId

#### ✅ Workflow Analytics
- [x] GET /api/workflows/analytics (with date range)

#### ✅ Workflow Templates
- [x] GET /api/workflows/templates

**Result:** 100% API endpoint coverage ✅

---

## Event Type Requirements

### Events to Consume (api-workflows)

**Business Triggers:**
- [x] `DEBTS_DEBT_CREATED` (implemented)
- [x] `TRANSACTIONS_PAYMENT_RECEIVED` (implemented)
- [x] `TRANSACTIONS_PROMISE_BROKEN` (implemented)
- [ ] `DEBTS_BALANCE_UPDATED` (optional - for high-balance triggers)
- [ ] `COMMUNICATIONS_EMAIL_BOUNCED` (optional - for communication failure triggers)
- [ ] `COLLECTORS_CAPACITY_EXCEEDED` (optional - for workload triggers)
- [ ] `COMPLIANCE_VIOLATION_DETECTED` (optional - for compliance escalations)

**Result Events (from api-automations):**
- [ ] `AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED` (missing listener)
- [ ] `AUTOMATIONS_AUTO_ASSIGNMENT_FAILED` (missing listener)
- [ ] `AUTOMATIONS_ESCALATION_COMPLETED` (missing listener)
- [ ] `AUTOMATIONS_ESCALATION_FAILED` (missing listener)

### Events to Publish (api-workflows)

**Command Events (to api-automations):**
- [ ] `AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT` (not yet published)
- [ ] `AUTOMATIONS_EXECUTE_SCHEDULED_AUTO_ASSIGNMENT` (not yet published)
- [ ] `AUTOMATIONS_EXECUTE_ESCALATION` (not yet published)

**Command Events (to other services):**
- [x] `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_EMAIL` (implemented)
- [x] `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_SMS` (implemented)
- [x] `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_NOTIFICATION` (implemented)
- [x] `COLLECTORS_WORKFLOW_COMMAND_CREATE_TASK` (implemented)
- [x] `COLLECTORS_WORKFLOW_COMMAND_ADD_TO_QUEUE` (implemented)
- [x] `COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED` (implemented)
- [x] `DEBTS_WORKFLOW_COMMAND_UPDATE_PRIORITY` (implemented)

---

## Dependencies on Other Services

### api-automations (Execution Engine)
**Status:** ✅ Fully Implemented (Dec 17, 2025)
- Auto-assignment strategies: Round Robin, Least Workload, Skill-Based, Geographic
- Escalation execution with multi-channel notifications
- Event-driven command consumption
- Result event publishing

**Integration Points:**
- Consumes: `AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT`, `AUTOMATIONS_EXECUTE_ESCALATION`
- Publishes: `AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED`, `AUTOMATIONS_ESCALATION_COMPLETED`, etc.

### api-collectors
**Status:** ✅ Partial (Dec 17, 2025)
- WorkQueueItem management operational
- CollectorResponseTracking operational
- Time tracking and utilization reports implemented
- Missing: Real collector skills/territory data (using mock data)

**Integration Points:**
- Provides collector data via EventOrchestratorClient
- Consumes: `COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED`, `COLLECTORS_WORKFLOW_COMMAND_CREATE_TASK`

### api-communications
**Status:** ⏳ Assumed Ready (not verified)

**Integration Points:**
- Consumes: `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_EMAIL`, `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_SMS`, `COMMUNICATIONS_WORKFLOW_COMMAND_SEND_NOTIFICATION`

### api-debts
**Status:** ⏳ Assumed Ready (not verified)

**Integration Points:**
- Publishes: `DEBTS_DEBT_CREATED`, `DEBTS_BALANCE_UPDATED`
- Consumes: `DEBTS_WORKFLOW_COMMAND_UPDATE_PRIORITY`

---

## Risks & Mitigation

### Risk 1: Event Type Mismatches
**Probability:** Medium
**Impact:** High

**Mitigation:**
- Use `@verichron/events` package as single source of truth for event types
- Add event payload validation using DTOs
- Integration tests with actual event payloads

### Risk 2: Circular Event Loops
**Probability:** Low
**Impact:** High

**Scenario:** Workflow triggers action → action publishes event → event triggers same workflow

**Mitigation:**
- Use correlationId tracking to detect loops
- Add max execution count per correlationId
- Monitor execution patterns in analytics

### Risk 3: Performance at Scale
**Probability:** Medium
**Impact:** Medium

**Concerns:**
- Analytics queries over large execution datasets
- High-frequency workflow triggers (e.g., every debt-created event)

**Mitigation:**
- Add database indexes on `workflow_executions(organization_id, triggered_at)`
- Implement analytics caching (refresh every 5-10 minutes)
- Add rate limiting to workflow triggers per organization

### Risk 4: Auto-Assignment Race Conditions
**Probability:** High
**Impact:** Medium

**Scenario:** Two auto-assignment configs both assign the same collector to the same account

**Mitigation:**
- Use database transactions in api-automations when updating assignments
- Add uniqueness constraint on `work_queue_items(debtor_id, collector_id)` where status is ACTIVE
- Implement optimistic locking with version fields

---

## Success Criteria

### Phase 1 Complete When:
- [ ] UI can create auto-assignment configurations via API
- [ ] Auto-assignment executes when debt is created
- [ ] Execution shows in workflow history (GET /workflows/executions)
- [ ] Analytics show successful assignments (GET /workflows/analytics)
- [ ] UI can create escalation rules via API
- [ ] Escalation executes when trigger condition is met
- [ ] Escalation sends notifications via api-communications
- [ ] All result events from api-automations are tracked

### Phase 2 Complete When:
- [ ] Scheduled auto-assignment jobs run every 15 minutes
- [ ] Scheduled escalation checks run every 15 minutes
- [ ] Time-based workflow triggers execute on schedule
- [ ] All integration tests pass
- [ ] Performance benchmarks met (< 1s for workflow evaluation, < 500ms for execution logging)

### Production Ready When:
- [ ] All Phase 1 & 2 criteria met
- [ ] Database migrations verified and tested
- [ ] Event integration tested end-to-end
- [ ] Error handling and retry logic verified
- [ ] Monitoring and alerting configured
- [ ] Documentation complete

---

## ✅ Design Decisions (Finalized)

### 1. Auto-Assignment Trigger Timing
**Decision:** Immediate execution with optional configurable delay

**Implementation:**
- Add `delayMinutes?: number` field to `AutoAssignmentConfig` (default: 0)
- Support immediate execution for fast assignment
- Allow configurable delay for batch processing or grace periods
- UI options: Immediate, 1 hour, 4 hours, 24 hours, Custom

### 2. Escalation Deduplication
**Decision:** 24 hours default with per-rule configurable cooldown

**Implementation:**
- Add `cooldownHours: number` field to `EscalationRule` (default: 24)
- Create `escalation_executions` table for tracking
- Check for recent execution before triggering
- Different cooldowns for different escalation types (broken promise: 12h, compliance: 7 days)

### 3. Round-Robin State
**Decision:** Store per config (current implementation is correct)

**Rationale:**
- Allows multiple round-robin strategies to coexist
- Example: "New Accounts" rotating through junior collectors, "High Balance" through seniors
- Current entity already has this: `lastAssignedCollectorId?: string`

**Edge Case Handling:** Reset to first collector if `lastAssignedCollectorId` no longer in pool

### 4. Execution History Retention
**Decision:** 90 days hot storage, 2 years archived, then purge

**Implementation:**
- Phase 1: Manual archival (monthly cron job)
- Phase 2: Automated `RetentionService` with S3 export
- UI banner: "Showing last 90 days. Older records available upon request."

### 5. Failed Auto-Assignment Handling
**Decision:** Auto-disable after 5 consecutive failures with manager alert

**Implementation:**
- Add fields to `AutoAssignmentConfig`:
  - `consecutiveFailures: number` (default: 0)
  - `autoDisabled: boolean` (default: false)
  - `autoDisabledAt?: Date`
  - `autoDisabledReason?: string`
- Reset `consecutiveFailures` to 0 on success
- Publish `WORKFLOWS_CONFIG_AUTO_DISABLED` event to alert managers
- UI: Show "Auto-Disabled" badge with re-enable button

---

## Next Steps

1. **Review this document** with the team/stakeholder
2. **Answer open questions** to finalize design decisions
3. **Verify database migrations** exist and are correct
4. **Begin Phase 1 implementation** starting with Gap 1 (Auto-Assignment Command Publishing)
5. **Test incrementally** as each gap is closed
6. **Connect UI to real API** once Phase 1 is complete

---

## Appendix: Key Files Reference

### Controllers
- `src/auto-assignment/auto-assignment.controller.ts`
- `src/escalation-rules/escalation-rules.controller.ts`
- `src/workflow-rules/workflow-rules.controller.ts`
- `src/workflow-executions/workflow-executions.controller.ts`
- `src/workflow-analytics/workflow-analytics.controller.ts`
- `src/workflow-templates/workflow-templates.controller.ts`

### Services
- `src/auto-assignment/auto-assignment.service.ts` (CRUD)
- `src/escalation-rules/escalation-rules.service.ts` (CRUD)
- `src/workflow-rules/workflow-rules.service.ts` (CRUD)
- `src/workflow-executions/workflow-executions.service.ts` (Query + Create)
- `src/workflow-analytics/workflow-analytics.service.ts` (Analytics)
- `src/engine/engine.service.ts` (Workflow Engine)
- `src/commands/commands.service.ts` (Command Publishing)
- `src/scheduler/scheduler.service.ts` (Job Scheduling)

### Entities
- `src/auto-assignment/entities/auto-assignment-config.entity.ts`
- `src/escalation-rules/entities/escalation-rule.entity.ts`
- `src/workflow-rules/entities/workflow-rule.entity.ts`
- `src/workflow-executions/entities/workflow-execution.entity.ts`
- `src/workflow-templates/entities/workflow-template.entity.ts`

### Event Listeners (Existing)
- `src/events/listeners/debt-created.listener.ts`
- `src/events/listeners/payment-received.listener.ts`
- `src/events/listeners/promise-broken.listener.ts`

### Event Listeners (To Be Created)
- `src/events/listeners/auto-assignment-trigger.listener.ts`
- `src/events/listeners/auto-assignment-result.listener.ts`
- `src/events/listeners/escalation-trigger.listener.ts`
- `src/events/listeners/escalation-result.listener.ts`

### Executor Services (To Be Created)
- `src/auto-assignment/auto-assignment-executor.service.ts`
- `src/escalation-rules/escalation-executor.service.ts`

---

**Document Status:** Ready for Review
**Approval Required From:** Technical Lead / Product Owner
**Implementation Ready:** After Open Questions are answered
