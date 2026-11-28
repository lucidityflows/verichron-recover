# API Automations - Implementation Complete

## Overview

The `api-automations` microservice has been successfully implemented as the automation execution engine for the Verichron debt collection platform. This service receives automation commands from `api-workflows` and executes them using cross-service orchestration.

## Architecture

### Service Separation

```
api-workflows (Rules Engine)
    ↓ publishes commands
api-automations (Execution Engine)
    ↓ queries via orchestrator
api-collectors (Data Provider)
```

**api-workflows** defines automation rules and triggers but delegates execution to **api-automations**, which has access to the EventOrchestratorClient for cross-service data queries.

## Implementation Summary

### 1. Auto-Assignment Module

**Location**: `apps/api-automations/src/auto-assignment/`

**Components**:
- `auto-assignment-executor.service.ts` (~640 lines)
  - Main business logic for executing assignments
  - Implements 4 assignment strategies:
    - **Round Robin**: Rotates through collector pool sequentially
    - **Least Workload**: Assigns to collector with fewest active accounts (queries api-collectors via orchestrator)
    - **Skill-Based**: Matches account category to collector skills (queries api-collectors via orchestrator)
    - **Geographic**: Matches account location to collector territories (queries api-collectors via orchestrator)

- `auto-assignment.service.ts`
  - Wraps executor
  - Publishes `AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED` or `AUTOMATIONS_AUTO_ASSIGNMENT_FAILED` events

- `execute-auto-assignment.listener.ts`
  - Subscribes to `AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT` events from api-workflows
  - Triggers assignment execution

**Event Flow**:
```
api-workflows publishes → AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT
    ↓
api-automations listener receives command
    ↓
Executor queries collector data via orchestrator
    ↓
Executor selects collector based on strategy
    ↓
Publishes COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED to api-collectors
    ↓
Publishes AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED back to api-workflows
```

### 2. Escalation Module

**Location**: `apps/api-automations/src/escalation/`

**Components**:
- `escalation-executor.service.ts`
  - Evaluates escalation trigger conditions using ConditionEvaluator
  - Sends notifications via 3 methods: EMAIL, SMS, IN_APP
  - Builds notification content (email body, SMS message, in-app notification)

- `escalation.service.ts`
  - Wraps executor
  - Publishes `AUTOMATIONS_ESCALATION_COMPLETED` or `AUTOMATIONS_ESCALATION_FAILED` events

- `execute-escalation.listener.ts`
  - Subscribes to `AUTOMATIONS_EXECUTE_ESCALATION` events from api-workflows
  - Triggers escalation execution

**Event Flow**:
```
api-workflows publishes → AUTOMATIONS_EXECUTE_ESCALATION
    ↓
api-automations listener receives command
    ↓
Executor evaluates conditions
    ↓
Sends notifications to escalation targets
    ↓
Publishes AUTOMATIONS_ESCALATION_COMPLETED
```

### 3. Condition Evaluator

**Location**: `apps/api-automations/src/common/helpers/condition-evaluator.helper.ts`

**Purpose**: Shared utility for evaluating workflow conditions

**Supported Operators**:
- `EQUALS`, `NOT_EQUALS`
- `GREATER_THAN`, `LESS_THAN`, `GREATER_THAN_OR_EQUAL`, `LESS_THAN_OR_EQUAL`
- `CONTAINS`, `NOT_CONTAINS`
- `BETWEEN`
- `IN`, `NOT_IN`

**Features**:
- Supports nested field access via dot notation (e.g., `"user.profile.name"`)
- Type-safe comparisons
- Comprehensive logging for debugging

### 4. Event DTOs

**Location**: `apps/api-automations/src/events/event-dto/automations/`

**Files**:
- `execute-auto-assignment.dto.ts` - Validates incoming assignment commands
- `auto-assignment-completed.dto.ts` - Validates outgoing completion events
- `execute-escalation.dto.ts` - Validates incoming escalation commands
- `escalation-completed.dto.dto.ts` - Validates outgoing completion events
- `constants.ts` - Maps event types to DTOs via `EVENT_DTO_MAP`

**Purpose**: Runtime validation using `class-validator` decorators following the three-layer event validation architecture.

### 5. Event Orchestrator Integration

**Location**: `packages/event-orchestrator/src/orchestrators/collectors-data.orchestrator.ts`

**Purpose**: Handles data requests from api-automations

**Subscribed Events**:
- `AUTOMATIONS_COLLECTORS_DATA_REQUESTED`

**Actions Supported**:
- `getCollectorWorkload` - Returns active account counts per collector
- `getCollectorSkills` - Returns skill tags per collector
- `getCollectorTerritories` - Returns geographic assignments per collector

**Flow**:
```
api-automations (executor) publishes request via EventOrchestratorClient
    ↓
collectors-data.orchestrator receives request
    ↓
Makes HTTP POST to api-collectors internal endpoints
    ↓
Publishes response back to api-automations
    ↓
EventOrchestratorClient resolves promise with data
```

### 6. API Collectors Internal Endpoints

**Location**: `apps/api-collectors/src/collector/`

**New Internal Endpoints** (all use `@Public()` decorator):

#### POST `/internal/collectors/workload`
Returns active account count for each collector.

**Request**:
```typescript
{
  organizationId: string;
  collectorIds: string[];
}
```

**Response**:
```typescript
{
  workload: {
    [collectorId: string]: number;
  }
}
```

#### POST `/internal/collectors/skills`
Returns skill tags for each collector.

**Request**:
```typescript
{
  organizationId: string;
  collectorIds: string[];
}
```

**Response**:
```typescript
{
  skills: {
    [collectorId: string]: string[];
  }
}
```

#### POST `/internal/collectors/territories`
Returns geographic territory assignments.

**Request**:
```typescript
{
  organizationId: string;
  collectorIds: string[];
}
```

**Response**:
```typescript
{
  territories: {
    [collectorId: string]: {
      states?: string[];
      zipcodes?: string[];
    }
  }
}
```

**Current Implementation**: Mock data generators. TODO: Implement actual data lookup from collector profiles.

### 7. API Workflows Integration

**Location**: `apps/api-workflows/src/auto-assignment/auto-assignment-executor.service.ts`

**Changes**:
- Completely refactored from ~425 lines of local execution logic to ~200 lines of command publishing
- Now publishes `AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT` command instead of executing locally
- Removed all strategy implementation code (delegated to api-automations)
- Removed CommandsService dependency (now uses EventPublisher directly)
- Simplified to: validate → build payload → publish command → update stats

**Event Payload Built**:
```typescript
{
  organizationId,
  configId,
  configName,
  strategy,
  collectorPool,
  excludeCollectors,
  maxAssignmentsPerDay,
  workloadThreshold,
  lastAssignedCollectorId,
  dailyAssignmentCounts,
  filters,
  targetEntityId,
  targetEntityType,
  targetEntityData: { balance, location, category, priority, ... },
  correlationId
}
```

## Shared Packages

### packages/contracts

**New Exports**:
- `AssignmentTarget` interface
- `AssignmentResult` interface
- `AutoAssignmentFilters` interface

### packages/events

**New Event Types**:
- `AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT`
- `AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED`
- `AUTOMATIONS_AUTO_ASSIGNMENT_FAILED`
- `AUTOMATIONS_EXECUTE_ESCALATION`
- `AUTOMATIONS_ESCALATION_COMPLETED`
- `AUTOMATIONS_ESCALATION_FAILED`
- `AUTOMATIONS_COLLECTORS_DATA_REQUESTED`
- `AUTOMATIONS_DEBTS_DATA_REQUESTED`

**New Payload Interfaces**:
- `ExecuteAutoAssignmentPayload`
- `AutoAssignmentCompletedPayload`
- `ExecuteEscalationPayload`
- `EscalationCompletedPayload`

## Build Status

✅ **api-automations**: Builds successfully
✅ **api-collectors**: Builds successfully
✅ **api-workflows**: Builds successfully
✅ **event-orchestrator**: Builds successfully

## Testing Recommendations

### Unit Tests Needed

1. **ConditionEvaluator** - Test all operators with various data types
2. **AutoAssignmentExecutorService** - Test each strategy with mock data
3. **EscalationExecutorService** - Test condition evaluation and notification building

### Integration Tests Needed

1. **End-to-End Auto-Assignment Flow**:
   - api-workflows publishes command
   - api-automations receives and processes
   - api-collectors internal endpoints called via orchestrator
   - Collector selected based on strategy
   - Assignment command published to api-collectors
   - Completion event published back

2. **End-to-End Escalation Flow**:
   - api-workflows publishes escalation command
   - api-automations evaluates conditions
   - Notifications sent via communications service
   - Completion event published back

### Manual Testing

1. **Create Auto-Assignment Config** in api-workflows UI
2. **Trigger Assignment** via workflow rule or scheduled job
3. **Monitor Logs**:
   - api-workflows: "Successfully published auto-assignment command"
   - api-automations: "Received EXECUTE_AUTO_ASSIGNMENT"
   - event-orchestrator: "Received collectors data request"
   - api-collectors: "Getting workload for N collectors"
   - api-automations: "Successfully assigned to collector X"

## Next Steps (Future Work)

### High Priority

1. **Implement Real Collector Data in api-collectors**:
   - Replace mock workload calculation with actual work queue counts
   - Implement skills lookup from collector profiles
   - Implement territories lookup from collector settings

2. **Add Completion Event Listeners in api-workflows**:
   - Listen for `AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED`
   - Update auto-assignment config with actual assignment results
   - Update `lastAssignedCollectorId` for round-robin
   - Update `dailyAssignmentCounts` for daily limits

3. **Add Error Handling**:
   - Implement retry logic for failed assignments
   - Add circuit breakers for orchestrator calls
   - Add monitoring and alerting for stuck assignments

### Medium Priority

1. **Add Assignment Analytics**:
   - Track assignment success rates by strategy
   - Track average assignment time
   - Track collector workload distribution

2. **Add Debts Data Orchestrator**:
   - Create `debts-data.orchestrator.ts`
   - Support queries for unassigned debts/accounts
   - Filter by auto-assignment config filters

3. **Optimize Orchestrator Queries**:
   - Batch requests where possible
   - Cache collector data (skills, territories) with TTL
   - Add query result pagination

### Low Priority

1. **Add Custom Assignment Strategies**:
   - Allow users to define custom scoring algorithms
   - Support weighted combinations of strategies
   - A/B testing framework for strategies

2. **Add Assignment Preview**:
   - Dry-run mode to preview assignments without executing
   - Show which collector would be selected for test data

## Configuration

### Environment Variables

**api-automations**:
```env
PUBSUB_PROJECT_ID=your-project-id
PUBSUB_EMULATOR_HOST=localhost:8085  # For local dev
API_COLLECTORS_URL=http://localhost:3007
```

**api-collectors**:
```env
# Internal endpoints use @Public() decorator
# No special configuration needed
```

**event-orchestrator**:
```env
# Configured in apps/api-automations/src/events/events.module.ts
```

## Monitoring

### Key Metrics to Track

1. **Assignment Latency**: Time from command received to assignment completed
2. **Orchestrator Request Success Rate**: % of successful collector data queries
3. **Strategy Distribution**: Which strategies are used most
4. **Assignment Success Rate**: % of assignments that complete successfully
5. **Collector Workload Balance**: Standard deviation of workload across collectors

### Log Patterns to Watch

- `"Failed to handle auto-assignment command"` - Assignment processing errors
- `"No available collectors"` - All collectors excluded by filters/limits
- `"No workload data received, falling back to round-robin"` - Orchestrator query failures
- `"Failed to check workload"` - api-collectors endpoint errors

## Performance Considerations

1. **Orchestrator Timeouts**: Default 3000ms, may need tuning based on collector pool size
2. **Concurrent Assignments**: Each assignment is independent, can process in parallel
3. **Database Load**: api-workflows updates config stats on every assignment
4. **Event Bus Load**: Each assignment produces 2-3 events (command + completion + work item)

## Security Considerations

1. **Internal Endpoints**: Use `@Public()` decorator - accessible without JWT
2. **Event Validation**: All events validated via DTOs with class-validator
3. **Organization Isolation**: All queries filtered by organizationId
4. **Audit Trail**: All assignments logged with correlationId for tracing

---

**Implementation Completed**: December 17, 2025
**Services Modified**: api-automations (new), api-workflows, api-collectors, event-orchestrator
**Packages Modified**: contracts, events, enums
**Total Lines Added**: ~2,000 lines
**Build Status**: ✅ All services compile successfully
