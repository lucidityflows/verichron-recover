# API Automations - Implementation Plan

**Service:** api-automations
**Purpose:** Automation execution engine (auto-assignment, escalation, workflow actions)
**Created:** 2025-12-17
**Status:** In Development

---

## Architecture Overview

### Service Responsibilities

**api-workflows** (Rules Engine):
- Define workflow rules, auto-assignment configs, escalation rules
- Evaluate triggers (events, time-based)
- Schedule automation execution
- Publish COMMANDS to api-automations

**api-automations** (Execution Engine):
- Execute auto-assignment strategies
- Execute escalation actions
- Query cross-service data via event-orchestrator
- Publish RESULTS/EVENTS back to event bus

**packages/event-orchestrator**:
- Centralized request-response orchestration handlers
- Used by api-automations to query:
  - api-collectors: workload, skills, territories, unassigned items
  - api-debts: debt details for escalation evaluation

### Event Flow

```
┌─────────────────┐
│   Event Bus     │
│  (Pub/Sub)      │
└────────┬────────┘
         │
         │ 1. Event (debt.created, promise.broken, etc.)
         ▼
┌─────────────────┐
│ api-workflows   │
│  (Rules Engine) │
│                 │
│ • Evaluate rule │
│ • Check trigger │
│ • Match?        │
└────────┬────────┘
         │
         │ 2. Command (if match)
         │    AUTOMATIONS.EXECUTE_AUTO_ASSIGNMENT
         │    AUTOMATIONS.EXECUTE_ESCALATION
         ▼
┌─────────────────────────────────┐
│ api-automations                 │
│  (Execution Engine)             │
│                                 │
│ • Receive command               │
│ • Query data (orchestrator) ────┼──┐
│ • Execute strategy              │  │
│ • Publish result command        │  │
└─────────────────────────────────┘  │
                                     │
         ┌───────────────────────────┘
         │ 3. Orchestrator Queries
         ▼
┌─────────────────────────────────┐
│ packages/event-orchestrator     │
│                                 │
│ Handlers:                       │
│ • collectors-data.orchestrator  │
│ • debts-data.orchestrator       │
└────────┬────────────────────────┘
         │
         │ 4. Request data
         ▼
┌─────────────────────┐  ┌─────────────────┐
│ api-collectors      │  │ api-debts       │
│                     │  │                 │
│ • getWorkload()     │  │ • getDetails()  │
│ • getSkills()       │  │                 │
│ • getTerritories()  │  │                 │
│ • getUnassigned()   │  │                 │
└─────────────────────┘  └─────────────────┘
```

---

## Implementation Tasks

### Phase 1: Core Auto-Assignment Module (Day 1-2)

#### Task 1.1: Create Auto-Assignment Module Structure

**Files to Create:**
```
src/auto-assignment/
├── auto-assignment.module.ts
├── auto-assignment.service.ts          # Main service (receive commands)
├── auto-assignment-executor.service.ts # Strategy execution
├── dto/
│   ├── execute-auto-assignment.dto.ts  # Command payload
│   └── assignment-result.dto.ts        # Result payload
└── types/
    ├── assignment-target.interface.ts
    ├── assignment-result.interface.ts
    └── collector-metadata.interface.ts
```

**auto-assignment.module.ts:**
```typescript
import { Module } from '@nestjs/common';
import { EventOrchestratorModule } from '@verichron/event-orchestrator';
import { AutoAssignmentService } from './auto-assignment.service';
import { AutoAssignmentExecutorService } from './auto-assignment-executor.service';

@Module({
  imports: [EventOrchestratorModule],
  providers: [AutoAssignmentService, AutoAssignmentExecutorService],
  exports: [AutoAssignmentService],
})
export class AutoAssignmentModule {}
```

**auto-assignment.service.ts** (Main entry point):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AutoAssignmentExecutorService } from './auto-assignment-executor.service';
import { ExecuteAutoAssignmentDto } from './dto/execute-auto-assignment.dto';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TOPICS, EVENT_TYPES, EVENT_SOURCES } from '@verichron/events';

@Injectable()
export class AutoAssignmentService {
  private readonly logger = new Logger(AutoAssignmentService.name);

  constructor(
    private readonly executor: AutoAssignmentExecutorService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Execute auto-assignment based on command from api-workflows
   */
  async executeAutoAssignment(dto: ExecuteAutoAssignmentDto): Promise<void> {
    this.logger.log(
      `Executing auto-assignment for org ${dto.organizationId}, config ${dto.configId}`
    );

    try {
      // Execute the assignment strategy
      const result = await this.executor.executeAssignment(dto);

      // Publish result event
      await this.eventPublisher.publish(
        EVENT_TOPICS.AUTOMATIONS,
        EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED,
        EVENT_SOURCES.AUTOMATIONS,
        {
          organizationId: dto.organizationId,
          configId: dto.configId,
          success: result.success,
          collectorId: result.collectorId,
          targetEntityId: result.targetEntityId,
          reason: result.reason,
          error: result.error,
        },
        dto.correlationId,
      );

      // If successful, publish assignment command to api-collectors
      if (result.success && result.collectorId) {
        await this.eventPublisher.publish(
          EVENT_TOPICS.COLLECTORS,
          EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED,
          EVENT_SOURCES.AUTOMATIONS,
          {
            organizationId: dto.organizationId,
            collectorId: result.collectorId,
            targetEntityId: result.targetEntityId,
            targetEntityType: dto.targetEntityType,
            assignedBy: 'auto-assignment',
            assignmentReason: `Auto-assignment config: ${dto.configName}`,
          },
          dto.correlationId,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Auto-assignment execution failed: ${errorMessage}`);

      // Publish failure event
      await this.eventPublisher.publish(
        EVENT_TOPICS.AUTOMATIONS,
        EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_FAILED,
        EVENT_SOURCES.AUTOMATIONS,
        {
          organizationId: dto.organizationId,
          configId: dto.configId,
          error: errorMessage,
        },
        dto.correlationId,
      );

      throw error;
    }
  }
}
```

**auto-assignment-executor.service.ts** (Strategy logic):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventOrchestratorClient } from '@verichron/event-orchestrator';
import { ExecuteAutoAssignmentDto } from './dto/execute-auto-assignment.dto';
import { AssignmentResult, AssignmentTarget, CollectorMetadata } from './types';
import { AutoAssignmentStrategy } from '@verichron/enums';

@Injectable()
export class AutoAssignmentExecutorService {
  private readonly logger = new Logger(AutoAssignmentExecutorService.name);

  constructor(private readonly orchestrator: EventOrchestratorClient) {}

  async executeAssignment(dto: ExecuteAutoAssignmentDto): Promise<AssignmentResult> {
    this.logger.debug(
      `Executing ${dto.strategy} strategy for ${dto.targetEntityType} ${dto.targetEntityId}`
    );

    try {
      // Step 1: Get available collectors (after filtering by exclusions and daily limits)
      const availableCollectors = await this.getAvailableCollectors(dto);

      if (availableCollectors.length === 0) {
        return {
          success: false,
          configId: dto.configId,
          targetEntityId: dto.targetEntityId,
          reason: 'No available collectors in pool',
        };
      }

      // Step 2: Select collector based on strategy
      let selectedCollectorId: string;

      switch (dto.strategy) {
        case AutoAssignmentStrategy.ROUND_ROBIN:
          selectedCollectorId = this.selectRoundRobin(dto, availableCollectors);
          break;

        case AutoAssignmentStrategy.LEAST_WORKLOAD:
          selectedCollectorId = await this.selectLeastWorkload(dto, availableCollectors);
          break;

        case AutoAssignmentStrategy.SKILL_BASED:
          selectedCollectorId = await this.selectSkillBased(dto, availableCollectors);
          break;

        case AutoAssignmentStrategy.GEOGRAPHIC:
          selectedCollectorId = await this.selectGeographic(dto, availableCollectors);
          break;

        default:
          throw new Error(`Unknown strategy: ${dto.strategy}`);
      }

      this.logger.log(
        `Selected collector ${selectedCollectorId} using ${dto.strategy} strategy`
      );

      return {
        success: true,
        collectorId: selectedCollectorId,
        configId: dto.configId,
        targetEntityId: dto.targetEntityId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Assignment execution failed: ${errorMessage}`);

      return {
        success: false,
        configId: dto.configId,
        targetEntityId: dto.targetEntityId,
        error: errorMessage,
      };
    }
  }

  private async getAvailableCollectors(dto: ExecuteAutoAssignmentDto): Promise<string[]> {
    // Filter collector pool by exclusions
    let available = dto.collectorPool.filter(
      (id) => !dto.excludeCollectors?.includes(id)
    );

    // TODO: Check daily assignment limits
    // TODO: Check workload thresholds via orchestrator

    return available;
  }

  private selectRoundRobin(
    dto: ExecuteAutoAssignmentDto,
    available: string[]
  ): string {
    if (!dto.lastAssignedCollectorId) {
      return available[0];
    }

    const lastIndex = available.indexOf(dto.lastAssignedCollectorId);
    if (lastIndex === -1) {
      return available[0];
    }

    const nextIndex = (lastIndex + 1) % available.length;
    return available[nextIndex];
  }

  private async selectLeastWorkload(
    dto: ExecuteAutoAssignmentDto,
    available: string[]
  ): Promise<string> {
    // Query collector workload via orchestrator
    const responses = await this.orchestrator.request({
      topic: 'CollectorsDataRequested',
      payload: {
        organizationId: dto.organizationId,
        action: 'getCollectorWorkload',
        collectorIds: available,
      },
      timeout: 3000,
    });

    if (responses.length === 0) {
      this.logger.warn('No workload data received, falling back to round-robin');
      return this.selectRoundRobin(dto, available);
    }

    // Aggregate responses (in case multiple responders)
    const workloadMap = new Map<string, number>();
    for (const response of responses) {
      const workload = response.payload.workload || {};
      for (const [collectorId, count] of Object.entries(workload)) {
        if (available.includes(collectorId)) {
          workloadMap.set(collectorId, count as number);
        }
      }
    }

    // Find collector with least workload
    let minWorkload = Infinity;
    let selectedCollector = available[0];

    for (const collectorId of available) {
      const workload = workloadMap.get(collectorId) || 0;
      if (workload < minWorkload) {
        minWorkload = workload;
        selectedCollector = collectorId;
      }
    }

    this.logger.debug(
      `Selected collector ${selectedCollector} with workload ${minWorkload}`
    );

    return selectedCollector;
  }

  private async selectSkillBased(
    dto: ExecuteAutoAssignmentDto,
    available: string[]
  ): Promise<string> {
    // Query collector skills via orchestrator
    const responses = await this.orchestrator.request({
      topic: 'CollectorsDataRequested',
      payload: {
        organizationId: dto.organizationId,
        action: 'getCollectorSkills',
        collectorIds: available,
      },
      timeout: 3000,
    });

    if (responses.length === 0) {
      this.logger.warn('No skills data received, falling back to round-robin');
      return this.selectRoundRobin(dto, available);
    }

    // Aggregate skills data
    const skillsMap = new Map<string, string[]>();
    for (const response of responses) {
      const skills = response.payload.skills || {};
      for (const [collectorId, collectorSkills] of Object.entries(skills)) {
        if (available.includes(collectorId)) {
          skillsMap.set(collectorId, collectorSkills as string[]);
        }
      }
    }

    // Match entity category to collector skills
    const entityCategory = dto.targetEntityData?.category;
    if (entityCategory) {
      for (const collectorId of available) {
        const skills = skillsMap.get(collectorId) || [];
        if (skills.includes(entityCategory)) {
          this.logger.debug(
            `Matched collector ${collectorId} with skill ${entityCategory}`
          );
          return collectorId;
        }
      }
    }

    // No skill match found, fall back to round-robin
    this.logger.debug('No skill match found, using round-robin');
    return this.selectRoundRobin(dto, available);
  }

  private async selectGeographic(
    dto: ExecuteAutoAssignmentDto,
    available: string[]
  ): Promise<string> {
    // Query collector territories via orchestrator
    const responses = await this.orchestrator.request({
      topic: 'CollectorsDataRequested',
      payload: {
        organizationId: dto.organizationId,
        action: 'getCollectorTerritories',
        collectorIds: available,
      },
      timeout: 3000,
    });

    if (responses.length === 0) {
      this.logger.warn('No territory data received, falling back to round-robin');
      return this.selectRoundRobin(dto, available);
    }

    // Aggregate territories data
    const territoriesMap = new Map<string, { states?: string[]; zipcodes?: string[] }>();
    for (const response of responses) {
      const territories = response.payload.territories || {};
      for (const [collectorId, territory] of Object.entries(territories)) {
        if (available.includes(collectorId)) {
          territoriesMap.set(collectorId, territory as any);
        }
      }
    }

    // Match entity location to collector territory
    const entityState = dto.targetEntityData?.location?.state;
    const entityZip = dto.targetEntityData?.location?.zipCode;

    if (entityState || entityZip) {
      for (const collectorId of available) {
        const territory = territoriesMap.get(collectorId);
        if (!territory) continue;

        // Check state match
        if (entityState && territory.states?.includes(entityState)) {
          this.logger.debug(
            `Matched collector ${collectorId} with state ${entityState}`
          );
          return collectorId;
        }

        // Check zip code match
        if (entityZip && territory.zipcodes?.includes(entityZip)) {
          this.logger.debug(
            `Matched collector ${collectorId} with zip ${entityZip}`
          );
          return collectorId;
        }
      }
    }

    // No geographic match found, fall back to round-robin
    this.logger.debug('No geographic match found, using round-robin');
    return this.selectRoundRobin(dto, available);
  }
}
```

**Acceptance Criteria:**
- [ ] Auto-assignment module created with service and executor
- [ ] Round-robin strategy works (no orchestrator needed)
- [ ] Least-workload strategy queries orchestrator and selects correctly
- [ ] Skill-based strategy queries orchestrator and matches skills
- [ ] Geographic strategy queries orchestrator and matches territories
- [ ] Publishes AUTO_ASSIGNMENT_COMPLETED event on success
- [ ] Publishes WORK_QUEUE_ITEM_ASSIGNED command to api-collectors

---

### Phase 2: Escalation Module (Day 2)

#### Task 2.1: Create Escalation Module Structure

**Files to Create:**
```
src/escalation/
├── escalation.module.ts
├── escalation.service.ts
├── escalation-executor.service.ts
├── dto/
│   ├── execute-escalation.dto.ts
│   └── escalation-result.dto.ts
└── types/
    └── escalation-context.interface.ts
```

**escalation-executor.service.ts** (Key logic):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventOrchestratorClient } from '@verichron/event-orchestrator';
import { EventPublisher } from '@verichron/event-publisher';
import { ExecuteEscalationDto } from './dto/execute-escalation.dto';
import { EVENT_TOPICS, EVENT_TYPES, EVENT_SOURCES } from '@verichron/events';

@Injectable()
export class EscalationExecutorService {
  private readonly logger = new Logger(EscalationExecutorService.name);

  constructor(
    private readonly orchestrator: EventOrchestratorClient,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async executeEscalation(dto: ExecuteEscalationDto): Promise<void> {
    this.logger.log(
      `Executing escalation ${dto.ruleId} for ${dto.targetEntityType} ${dto.targetEntityId}`
    );

    try {
      // Step 1: Query entity data if needed (for condition evaluation)
      let entityData = dto.targetEntityData;
      if (!entityData || Object.keys(entityData).length === 0) {
        entityData = await this.queryEntityData(dto);
      }

      // Step 2: Evaluate escalation conditions
      const shouldEscalate = this.evaluateConditions(dto.triggerConditions, entityData);

      if (!shouldEscalate) {
        this.logger.debug('Escalation conditions not met, skipping');
        return;
      }

      // Step 3: Send notifications via configured methods
      for (const method of dto.notificationMethods) {
        await this.sendNotification(dto, method, entityData);
      }

      // Step 4: Publish escalation completed event
      await this.eventPublisher.publish(
        EVENT_TOPICS.AUTOMATIONS,
        EVENT_TYPES.AUTOMATIONS_ESCALATION_COMPLETED,
        EVENT_SOURCES.AUTOMATIONS,
        {
          organizationId: dto.organizationId,
          ruleId: dto.ruleId,
          ruleName: dto.ruleName,
          targetEntityId: dto.targetEntityId,
          targetEntityType: dto.targetEntityType,
          escalatedTo: dto.escalateTo,
          escalationTargets: dto.escalationTargets,
          priority: dto.priority,
        },
        dto.correlationId,
      );

      this.logger.log(`Escalation ${dto.ruleId} executed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Escalation execution failed: ${errorMessage}`);

      // Publish failure event
      await this.eventPublisher.publish(
        EVENT_TOPICS.AUTOMATIONS,
        EVENT_TYPES.AUTOMATIONS_ESCALATION_FAILED,
        EVENT_SOURCES.AUTOMATIONS,
        {
          organizationId: dto.organizationId,
          ruleId: dto.ruleId,
          targetEntityId: dto.targetEntityId,
          error: errorMessage,
        },
        dto.correlationId,
      );

      throw error;
    }
  }

  private async queryEntityData(dto: ExecuteEscalationDto): Promise<any> {
    // Query debt/debtor details via orchestrator
    const topic = dto.targetEntityType === 'DEBT' ? 'DebtsDataRequested' : 'DebtorsDataRequested';

    const responses = await this.orchestrator.request({
      topic,
      payload: {
        organizationId: dto.organizationId,
        action: 'getEntityDetails',
        entityId: dto.targetEntityId,
      },
      timeout: 3000,
    });

    if (responses.length === 0) {
      throw new Error('No entity data received from orchestrator');
    }

    return responses[0].payload;
  }

  private evaluateConditions(conditions: any[], entityData: any): boolean {
    // Simple AND logic - all conditions must be true
    return conditions.every((condition) => {
      const fieldValue = this.getNestedValue(entityData, condition.field);
      return this.evaluateCondition(condition, fieldValue);
    });
  }

  private evaluateCondition(condition: any, value: any): boolean {
    // Same logic as api-workflows engine.service.ts
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      // ... other operators
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  private async sendNotification(
    dto: ExecuteEscalationDto,
    method: string,
    entityData: any
  ): Promise<void> {
    const eventType =
      method === 'email'
        ? EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_EMAIL
        : method === 'sms'
        ? EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_SMS
        : EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_NOTIFICATION;

    await this.eventPublisher.publish(
      EVENT_TOPICS.COMMUNICATIONS,
      eventType,
      EVENT_SOURCES.AUTOMATIONS,
      {
        organizationId: dto.organizationId,
        recipients: dto.escalationTargets,
        subject: `Escalation Alert: ${dto.ruleName}`,
        message: this.buildNotificationMessage(dto, entityData),
        priority: dto.priority,
        metadata: {
          ruleId: dto.ruleId,
          ruleName: dto.ruleName,
          targetEntityId: dto.targetEntityId,
          targetEntityType: dto.targetEntityType,
        },
      },
      dto.correlationId,
    );
  }

  private buildNotificationMessage(dto: ExecuteEscalationDto, entityData: any): string {
    return `
      Escalation Alert: ${dto.ruleName}

      Target: ${dto.targetEntityType} ${dto.targetEntityId}
      Priority: ${dto.priority}
      Reason: Escalation conditions met

      Details:
      ${JSON.stringify(entityData, null, 2)}
    `;
  }
}
```

**Acceptance Criteria:**
- [ ] Escalation module created with service and executor
- [ ] Queries entity data via orchestrator when not provided
- [ ] Evaluates escalation conditions correctly
- [ ] Sends notifications via email/SMS/in-app based on config
- [ ] Publishes ESCALATION_COMPLETED event
- [ ] Handles failures gracefully with ESCALATION_FAILED event

---

### Phase 3: Event Listeners (Day 3)

#### Task 3.1: Create Command Listeners

**Files to Create:**
```
src/events/listeners/
├── execute-auto-assignment.listener.ts
└── execute-escalation.listener.ts
```

**execute-auto-assignment.listener.ts:**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, EventEnvelope } from '@verichron/events';
import { AutoAssignmentService } from '../../auto-assignment/auto-assignment.service';
import { ExecuteAutoAssignmentDto } from '../../auto-assignment/dto/execute-auto-assignment.dto';

@Injectable()
export class ExecuteAutoAssignmentListener {
  private readonly logger = new Logger(ExecuteAutoAssignmentListener.name);

  constructor(private readonly autoAssignmentService: AutoAssignmentService) {}

  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT,
    subscriptionName: 'api-automations-execute-auto-assignment',
  })
  async handleExecuteAutoAssignment(envelope: EventEnvelope<any>) {
    this.logger.debug(`Received EXECUTE_AUTO_ASSIGNMENT: ${JSON.stringify(envelope.data)}`);

    try {
      const dto = new ExecuteAutoAssignmentDto();
      Object.assign(dto, envelope.data);
      dto.correlationId = envelope.correlationId;

      await this.autoAssignmentService.executeAutoAssignment(dto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to handle auto-assignment command: ${errorMessage}`);
      // Don't throw - we don't want to fail the event processing
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Listeners created for EXECUTE_AUTO_ASSIGNMENT and EXECUTE_ESCALATION
- [ ] Listeners call respective service methods
- [ ] Error handling prevents event processing failures
- [ ] Listeners registered in events.module.ts

---

### Phase 4: Orchestrator Handlers in packages/event-orchestrator (Day 3-4)

#### Task 4.1: Create Collectors Data Orchestrator

**File:** `packages/event-orchestrator/src/orchestrators/collectors-data.orchestrator.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RequestEventHandler } from '../decorators/request-event-handler.decorator';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CollectorsDataOrchestrator {
  private readonly logger = new Logger(CollectorsDataOrchestrator.name);
  private readonly apiCollectorsUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiCollectorsUrl =
      this.configService.get<string>('API_COLLECTORS_URL') || 'http://localhost:3007';
  }

  @RequestEventHandler('CollectorsDataRequested')
  async handleCollectorsDataRequest(payload: any): Promise<any> {
    const { organizationId, action, collectorIds } = payload;

    this.logger.debug(
      `Handling CollectorsDataRequested: action=${action}, org=${organizationId}`
    );

    try {
      switch (action) {
        case 'getCollectorWorkload':
          return await this.getCollectorWorkload(organizationId, collectorIds);

        case 'getCollectorSkills':
          return await this.getCollectorSkills(organizationId, collectorIds);

        case 'getCollectorTerritories':
          return await this.getCollectorTerritories(organizationId, collectorIds);

        case 'getUnassignedItems':
          return await this.getUnassignedItems(organizationId, payload.filters);

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`CollectorsDataOrchestrator error: ${errorMessage}`);
      throw error;
    }
  }

  private async getCollectorWorkload(
    organizationId: string,
    collectorIds: string[]
  ): Promise<any> {
    const url = `${this.apiCollectorsUrl}/internal/collectors/workload`;
    const response = await firstValueFrom(
      this.httpService.post(url, {
        organizationId,
        collectorIds,
      })
    );

    return { workload: response.data };
  }

  private async getCollectorSkills(
    organizationId: string,
    collectorIds: string[]
  ): Promise<any> {
    const url = `${this.apiCollectorsUrl}/internal/collectors/skills`;
    const response = await firstValueFrom(
      this.httpService.post(url, {
        organizationId,
        collectorIds,
      })
    );

    return { skills: response.data };
  }

  private async getCollectorTerritories(
    organizationId: string,
    collectorIds: string[]
  ): Promise<any> {
    const url = `${this.apiCollectorsUrl}/internal/collectors/territories`;
    const response = await firstValueFrom(
      this.httpService.post(url, {
        organizationId,
        collectorIds,
      })
    );

    return { territories: response.data };
  }

  private async getUnassignedItems(organizationId: string, filters: any): Promise<any> {
    const url = `${this.apiCollectorsUrl}/internal/work-queues/unassigned`;
    const response = await firstValueFrom(
      this.httpService.post(url, {
        organizationId,
        filters,
      })
    );

    return { items: response.data };
  }
}
```

#### Task 4.2: Create Debts Data Orchestrator

**File:** `packages/event-orchestrator/src/orchestrators/debts-data.orchestrator.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RequestEventHandler } from '../decorators/request-event-handler.decorator';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DebtsDataOrchestrator {
  private readonly logger = new Logger(DebtsDataOrchestrator.name);
  private readonly apiDebtsUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiDebtsUrl =
      this.configService.get<string>('API_DEBTS_URL') || 'http://localhost:3003';
  }

  @RequestEventHandler('DebtsDataRequested')
  async handleDebtsDataRequest(payload: any): Promise<any> {
    const { organizationId, action, entityId } = payload;

    this.logger.debug(
      `Handling DebtsDataRequested: action=${action}, org=${organizationId}`
    );

    try {
      switch (action) {
        case 'getEntityDetails':
          return await this.getDebtDetails(organizationId, entityId);

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`DebtsDataOrchestrator error: ${errorMessage}`);
      throw error;
    }
  }

  private async getDebtDetails(organizationId: string, debtId: string): Promise<any> {
    const url = `${this.apiDebtsUrl}/internal/debts/${debtId}`;
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          'X-Organization-Id': organizationId,
        },
      })
    );

    return response.data;
  }
}
```

#### Task 4.3: Update Orchestrator Index

**File:** `packages/event-orchestrator/src/orchestrators/index.ts`

```typescript
export * from './collectors-data.orchestrator';
export * from './debts-data.orchestrator';
// ... existing orchestrators
```

**Acceptance Criteria:**
- [ ] collectors-data.orchestrator.ts created with 4 action handlers
- [ ] debts-data.orchestrator.ts created with 1 action handler
- [ ] Both orchestrators registered in event-orchestrator module
- [ ] HTTP calls to api-collectors and api-debts work correctly

---

### Phase 5: Internal Endpoints in api-collectors (Day 4-5)

#### Task 5.1: Create Internal Endpoints

**Files to Create in api-collectors:**
```
src/internal/
├── internal.module.ts
├── internal.controller.ts
└── internal.service.ts
```

**internal.controller.ts:**
```typescript
import { Controller, Post, Get, Body, Param, Headers } from '@nestjs/common';
import { InternalService } from './internal.service';

@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post('collectors/workload')
  async getCollectorWorkload(
    @Body() body: { organizationId: string; collectorIds: string[] }
  ) {
    return await this.internalService.getCollectorWorkload(
      body.organizationId,
      body.collectorIds
    );
  }

  @Post('collectors/skills')
  async getCollectorSkills(
    @Body() body: { organizationId: string; collectorIds: string[] }
  ) {
    return await this.internalService.getCollectorSkills(
      body.organizationId,
      body.collectorIds
    );
  }

  @Post('collectors/territories')
  async getCollectorTerritories(
    @Body() body: { organizationId: string; collectorIds: string[] }
  ) {
    return await this.internalService.getCollectorTerritories(
      body.organizationId,
      body.collectorIds
    );
  }

  @Post('work-queues/unassigned')
  async getUnassignedItems(
    @Body() body: { organizationId: string; filters: any }
  ) {
    return await this.internalService.getUnassignedItems(
      body.organizationId,
      body.filters
    );
  }
}
```

**internal.service.ts:**
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collector } from '../collectors/entities/collector.entity';
import { WorkQueueItem } from '../work-queues/entities/work-queue-item.entity';

@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(Collector)
    private readonly collectorRepository: Repository<Collector>,
    @InjectRepository(WorkQueueItem)
    private readonly workQueueRepository: Repository<WorkQueueItem>,
  ) {}

  async getCollectorWorkload(
    organizationId: string,
    collectorIds: string[]
  ): Promise<Record<string, number>> {
    const workload: Record<string, number> = {};

    for (const collectorId of collectorIds) {
      const count = await this.workQueueRepository.count({
        where: {
          organizationId,
          assignedTo: collectorId,
          status: 'active', // or whatever your active status is
        },
      });
      workload[collectorId] = count;
    }

    return workload;
  }

  async getCollectorSkills(
    organizationId: string,
    collectorIds: string[]
  ): Promise<Record<string, string[]>> {
    const collectors = await this.collectorRepository.find({
      where: {
        organizationId,
        id: In(collectorIds),
      },
    });

    const skills: Record<string, string[]> = {};
    for (const collector of collectors) {
      skills[collector.id] = collector.skills || [];
    }

    return skills;
  }

  async getCollectorTerritories(
    organizationId: string,
    collectorIds: string[]
  ): Promise<Record<string, { states?: string[]; zipcodes?: string[] }>> {
    const collectors = await this.collectorRepository.find({
      where: {
        organizationId,
        id: In(collectorIds),
      },
    });

    const territories: Record<string, any> = {};
    for (const collector of collectors) {
      territories[collector.id] = {
        states: collector.territoryStates || [],
        zipcodes: collector.territoryZipcodes || [],
      };
    }

    return territories;
  }

  async getUnassignedItems(organizationId: string, filters: any): Promise<any[]> {
    const query = this.workQueueRepository.createQueryBuilder('item');
    query.where('item.organizationId = :organizationId', { organizationId });
    query.andWhere('item.assignedTo IS NULL');

    // Apply filters
    if (filters.portfolioIds && filters.portfolioIds.length > 0) {
      query.andWhere('item.portfolioId IN (:...portfolioIds)', {
        portfolioIds: filters.portfolioIds,
      });
    }

    if (filters.balanceRange) {
      const [min, max] = filters.balanceRange;
      query.andWhere('item.balance BETWEEN :min AND :max', { min, max });
    }

    // ... more filters

    return await query.getMany();
  }
}
```

**Acceptance Criteria:**
- [ ] Internal module created in api-collectors
- [ ] 4 endpoints implemented: /workload, /skills, /territories, /unassigned
- [ ] Endpoints query database and return proper data structures
- [ ] Orchestrator can successfully call these endpoints

---

### Phase 6: Update api-workflows (Day 5)

#### Task 6.1: Update CommandsService to Publish to api-automations

**File:** `apps/api-workflows/src/commands/commands.service.ts`

**Changes:**
```typescript
// Change ASSIGN_TO_COLLECTOR and REASSIGN_TO_COLLECTOR actions
case WorkflowActionType.ASSIGN_TO_COLLECTOR:
case WorkflowActionType.REASSIGN_TO_COLLECTOR:
  topic = EVENT_TOPICS.AUTOMATIONS; // Changed from COLLECTORS
  eventType = EVENT_TYPES.AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT; // New event type
  eventSource = EVENT_SOURCES.WORKFLOWS;
  data = {
    organizationId,
    configId: action.config.autoAssignmentConfigId, // Config ID from rule action
    targetEntityId,
    targetEntityType,
    // Pass config details from workflow rule
    strategy: action.config.strategy,
    collectorPool: action.config.collectorPool,
    // ... other config fields
  };
  break;
```

#### Task 6.2: Add New Event Types

**File:** `packages/events/src/event-types.ts`

```typescript
// Add to EVENT_TYPES
AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT = 'automations.execute-auto-assignment',
AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED = 'automations.auto-assignment-completed',
AUTOMATIONS_AUTO_ASSIGNMENT_FAILED = 'automations.auto-assignment-failed',
AUTOMATIONS_EXECUTE_ESCALATION = 'automations.execute-escalation',
AUTOMATIONS_ESCALATION_COMPLETED = 'automations.escalation-completed',
AUTOMATIONS_ESCALATION_FAILED = 'automations.escalation-failed',
```

**Acceptance Criteria:**
- [ ] api-workflows publishes EXECUTE_AUTO_ASSIGNMENT instead of direct assignment
- [ ] New event types added to @verichron/events
- [ ] api-workflows no longer directly assigns - delegates to api-automations

---

## Testing Plan

### Unit Tests

**api-automations:**
- [ ] auto-assignment-executor.service.spec.ts
- [ ] escalation-executor.service.spec.ts
- [ ] Round-robin strategy tests
- [ ] Least-workload strategy tests (mock orchestrator)
- [ ] Skill-based strategy tests (mock orchestrator)
- [ ] Geographic strategy tests (mock orchestrator)

**packages/event-orchestrator:**
- [ ] collectors-data.orchestrator.spec.ts
- [ ] debts-data.orchestrator.spec.ts

### Integration Tests

- [ ] E2E: Debt created → Rule triggered → Auto-assignment executed → Collector assigned
- [ ] E2E: Promise broken → Escalation executed → Notifications sent
- [ ] Orchestrator request-response flow (api-automations ↔ api-collectors)

### Manual Testing Checklist

- [ ] Create auto-assignment config in api-workflows
- [ ] Trigger debt-created event
- [ ] Verify api-workflows publishes EXECUTE_AUTO_ASSIGNMENT
- [ ] Verify api-automations receives command
- [ ] Verify orchestrator queries api-collectors
- [ ] Verify collector is assigned
- [ ] Verify AUTO_ASSIGNMENT_COMPLETED event published
- [ ] Check logs for errors

---

## Event Types Reference

### New Event Types Needed

```typescript
// In packages/events/src/event-types.ts
export const EVENT_TYPES = {
  // ... existing types

  // Automations
  AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT: 'automations.execute-auto-assignment',
  AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED: 'automations.auto-assignment-completed',
  AUTOMATIONS_AUTO_ASSIGNMENT_FAILED: 'automations.auto-assignment-failed',
  AUTOMATIONS_EXECUTE_ESCALATION: 'automations.execute-escalation',
  AUTOMATIONS_ESCALATION_COMPLETED: 'automations.escalation-completed',
  AUTOMATIONS_ESCALATION_FAILED: 'automations.escalation-failed',
};

// In packages/events/src/event-topics.ts
export const EVENT_TOPICS = {
  // ... existing topics
  AUTOMATIONS: 'automations-v1',
};
```

---

## Timeline Estimate

| Phase | Description | Days | Status |
|-------|-------------|------|--------|
| 1 | Auto-Assignment Module | 1-2 | 🔄 In Progress |
| 2 | Escalation Module | 1 | ⏳ Pending |
| 3 | Event Listeners | 0.5 | ⏳ Pending |
| 4 | Orchestrator Handlers | 1 | ⏳ Pending |
| 5 | api-collectors Internal Endpoints | 1-2 | ⏳ Pending |
| 6 | Update api-workflows | 0.5 | ⏳ Pending |
| Testing | Unit + Integration + E2E | 1 | ⏳ Pending |
| **Total** | | **5-7 days** | |

---

## Success Criteria

### MVP Complete When:
- [ ] Auto-assignment executor works with all 4 strategies
- [ ] Escalation executor evaluates conditions and sends notifications
- [ ] Event listeners receive and process workflow commands
- [ ] Orchestrator handlers in packages/event-orchestrator work correctly
- [ ] api-collectors internal endpoints return proper data
- [ ] api-workflows delegates to api-automations instead of direct execution
- [ ] E2E flow works: Event → api-workflows → api-automations → api-collectors
- [ ] All event types defined and published correctly
- [ ] Zero TypeScript errors
- [ ] Core unit tests pass

---

**Next Steps:** Begin Phase 1 - Auto-Assignment Module implementation
