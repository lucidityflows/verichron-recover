# Phase 1 Implementation Plan - Workflow Automation API

**Duration:** 3 Days (24 hours)
**Goal:** Enable UI to switch from mocks to real APIs for auto-assignment and escalation
**Status:** Ready to Execute

---

## Day 1: Database & Auto-Assignment (8 hours)

### Morning: Database Migrations & Entity Updates (3 hours)

#### Task 1.1: Update AutoAssignmentConfig Entity (30 min)
**File:** `src/auto-assignment/entities/auto-assignment-config.entity.ts`

**Add Fields:**
```typescript
@Column({ type: 'integer', default: 0, name: 'consecutive_failures' })
consecutiveFailures: number;

@Column({ type: 'boolean', default: false, name: 'auto_disabled' })
autoDisabled: boolean;

@Column({ type: 'timestamptz', nullable: true, name: 'auto_disabled_at' })
autoDisabledAt?: Date;

@Column({ type: 'text', nullable: true, name: 'auto_disabled_reason' })
autoDisabledReason?: string;

@Column({ type: 'integer', nullable: true, name: 'delay_minutes' })
delayMinutes?: number;
```

**Update Interface:**
```typescript
export interface AutoAssignmentFilters {
  portfolioIds?: string[];
  balanceRange?: [number, number];
  accountAgeRange?: [number, number];
  priority?: string[];
  [key: string]: any;
}
```

#### Task 1.2: Update WorkflowExecution Entity (15 min)
**File:** `src/workflow-executions/entities/workflow-execution.entity.ts`

**Add Field:**
```typescript
@Column({ type: 'varchar', length: 255, nullable: true, name: 'correlation_id' })
@Index('idx_workflow_executions_correlation')
correlationId?: string;
```

#### Task 1.3: Update EscalationRule Entity (15 min)
**File:** `src/escalation-rules/entities/escalation-rule.entity.ts`

**Add Field:**
```typescript
@Column({ type: 'integer', default: 24, name: 'cooldown_hours' })
cooldownHours: number;
```

#### Task 1.4: Create EscalationExecution Entity (30 min)
**File:** `src/escalation-rules/entities/escalation-execution.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { EscalationRule } from './escalation-rule.entity';
import { WorkflowTargetEntityType } from '@verichron/enums';

@Entity('escalation_executions')
@Index(['organizationId', 'ruleId', 'targetEntityId', 'executedAt'])
export class EscalationExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'rule_id' })
  ruleId: string;

  @ManyToOne(() => EscalationRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule: EscalationRule;

  @Column({ type: 'uuid', name: 'target_entity_id' })
  targetEntityId: string;

  @Column({
    type: 'enum',
    enum: WorkflowTargetEntityType,
    name: 'target_entity_type',
  })
  targetEntityType: WorkflowTargetEntityType;

  @CreateDateColumn({ type: 'timestamptz', name: 'executed_at' })
  executedAt: Date;
}
```

**Export in index.ts:**
```typescript
// src/escalation-rules/entities/index.ts
export { EscalationRule } from './escalation-rule.entity';
export { EscalationExecution } from './escalation-execution.entity';
```

#### Task 1.5: Create Database Migrations (1 hour)
**File:** `src/migrations/1734552000000-UpdateWorkflowEntities.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateWorkflowEntities1734552000000 implements MigrationInterface {
  name = 'UpdateWorkflowEntities1734552000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add columns to auto_assignment_configs
    await queryRunner.query(`
      ALTER TABLE auto_assignment_configs
      ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN auto_disabled BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN auto_disabled_at TIMESTAMPTZ,
      ADD COLUMN auto_disabled_reason TEXT,
      ADD COLUMN delay_minutes INTEGER;
    `);

    // 2. Add correlation_id to workflow_executions
    await queryRunner.query(`
      ALTER TABLE workflow_executions
      ADD COLUMN correlation_id VARCHAR(255);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_workflow_executions_correlation
      ON workflow_executions(correlation_id);
    `);

    // 3. Add cooldown_hours to escalation_rules
    await queryRunner.query(`
      ALTER TABLE escalation_rules
      ADD COLUMN cooldown_hours INTEGER NOT NULL DEFAULT 24;
    `);

    // 4. Create escalation_executions table
    await queryRunner.query(`
      CREATE TABLE escalation_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        rule_id UUID NOT NULL,
        target_entity_id UUID NOT NULL,
        target_entity_type VARCHAR(50) NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_escalation_executions_rule
          FOREIGN KEY (rule_id)
          REFERENCES escalation_rules(id)
          ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_escalation_executions_dedup
      ON escalation_executions(organization_id, rule_id, target_entity_id, executed_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_escalation_executions_dedup`);
    await queryRunner.query(`DROP TABLE escalation_executions`);
    await queryRunner.query(`ALTER TABLE escalation_rules DROP COLUMN cooldown_hours`);
    await queryRunner.query(`DROP INDEX idx_workflow_executions_correlation`);
    await queryRunner.query(`ALTER TABLE workflow_executions DROP COLUMN correlation_id`);
    await queryRunner.query(`
      ALTER TABLE auto_assignment_configs
      DROP COLUMN delay_minutes,
      DROP COLUMN auto_disabled_reason,
      DROP COLUMN auto_disabled_at,
      DROP COLUMN auto_disabled,
      DROP COLUMN consecutive_failures;
    `);
  }
}
```

**Run Migration:**
```bash
cd apps/api-workflows
npm run migration:run
```

---

### Afternoon: Auto-Assignment Command Publishing (5 hours)

#### Task 1.6: Create AutoAssignmentExecutorService (2 hours)
**File:** `src/auto-assignment/auto-assignment-executor.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@verichron/event-publisher';
import { AutoAssignmentService } from './auto-assignment.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { EVENT_TOPICS, EVENT_TYPES, EVENT_SOURCES } from '@verichron/events';
import { AutoAssignmentConfig } from './entities/auto-assignment-config.entity';

interface ExecuteAutoAssignmentParams {
  organizationId: string;
  configId: string;
  targetEntityId: string;
  targetEntityType: string;
  targetEntityData: any;
  correlationId?: string;
}

@Injectable()
export class AutoAssignmentExecutorService {
  private readonly logger = new Logger(AutoAssignmentExecutorService.name);
  private readonly assignmentCounts = new Map<string, number[]>();
  private readonly MAX_ASSIGNMENTS_PER_ORG_PER_MINUTE = 100;

  constructor(
    private readonly autoAssignmentService: AutoAssignmentService,
    private readonly eventPublisher: EventPublisher,
    private readonly schedulerService: SchedulerService,
  ) {}

  async executeAutoAssignment(params: ExecuteAutoAssignmentParams): Promise<void> {
    const { organizationId, configId, targetEntityId, targetEntityType, targetEntityData, correlationId } = params;

    this.logger.log(
      `Executing auto-assignment: config=${configId}, target=${targetEntityId}, type=${targetEntityType}`
    );

    try {
      // Rate limit check
      if (!this.checkRateLimit(organizationId)) {
        this.logger.warn(`Rate limit exceeded for organization ${organizationId}`);
        return;
      }

      // Fetch config
      const config = await this.autoAssignmentService.findOne(organizationId, configId);

      // Check if config is enabled and not auto-disabled
      if (!config.enabled || config.autoDisabled) {
        this.logger.debug(
          `Auto-assignment config ${configId} is disabled (enabled=${config.enabled}, autoDisabled=${config.autoDisabled})`
        );
        return;
      }

      // Check if delay is configured
      if (config.delayMinutes && config.delayMinutes > 0) {
        this.logger.log(`Scheduling auto-assignment with ${config.delayMinutes} minute delay`);
        await this.schedulerService.scheduleAutoAssignment(
          organizationId,
          configId,
          targetEntityId,
          targetEntityType,
          targetEntityData,
          config.delayMinutes * 60 * 1000, // Convert to milliseconds
          correlationId
        );
        return;
      }

      // Validate filters match target entity
      if (!this.validateFilters(config, targetEntityData)) {
        this.logger.debug(`Target entity ${targetEntityId} does not match config ${configId} filters`);
        return;
      }

      // Publish command to api-automations
      await this.publishAutoAssignmentCommand(config, targetEntityId, targetEntityType, targetEntityData, correlationId);

      this.logger.log(`Auto-assignment command published for config ${configId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to execute auto-assignment for config ${configId}: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  private checkRateLimit(organizationId: string): boolean {
    const now = Date.now();
    const orgCounts = this.assignmentCounts.get(organizationId) || [];

    // Remove timestamps older than 1 minute
    const recentCounts = orgCounts.filter(ts => now - ts < 60000);

    if (recentCounts.length >= this.MAX_ASSIGNMENTS_PER_ORG_PER_MINUTE) {
      return false;
    }

    // Track this execution
    recentCounts.push(now);
    this.assignmentCounts.set(organizationId, recentCounts);

    return true;
  }

  private validateFilters(config: AutoAssignmentConfig, targetEntityData: any): boolean {
    const { filters } = config;

    // Portfolio filter
    if (filters.portfolioIds && filters.portfolioIds.length > 0) {
      const portfolioId = targetEntityData.portfolioId || targetEntityData.portfolio?.id;
      if (!portfolioId || !filters.portfolioIds.includes(portfolioId)) {
        return false;
      }
    }

    // Balance range filter
    if (filters.balanceRange && filters.balanceRange.length === 2) {
      const balance = targetEntityData.balance || targetEntityData.totalBalance || 0;
      const [min, max] = filters.balanceRange;
      if (balance < min || balance > max) {
        return false;
      }
    }

    // Account age filter
    if (filters.accountAgeRange && filters.accountAgeRange.length === 2) {
      const createdAt = targetEntityData.createdAt ? new Date(targetEntityData.createdAt) : null;
      if (createdAt) {
        const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const [minAge, maxAge] = filters.accountAgeRange;
        if (ageInDays < minAge || ageInDays > maxAge) {
          return false;
        }
      }
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      const priority = targetEntityData.priority;
      if (!priority || !filters.priority.includes(priority)) {
        return false;
      }
    }

    return true;
  }

  private async publishAutoAssignmentCommand(
    config: AutoAssignmentConfig,
    targetEntityId: string,
    targetEntityType: string,
    targetEntityData: any,
    correlationId?: string
  ): Promise<void> {
    const finalCorrelationId = correlationId || `auto-assign-${config.id}-${Date.now()}`;

    await this.eventPublisher.publish(
      EVENT_TOPICS.AUTOMATIONS,
      EVENT_TYPES.AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT,
      EVENT_SOURCES.WORKFLOWS,
      {
        organizationId: config.organizationId,
        configId: config.id,
        configName: config.name,
        strategy: config.strategy,
        filters: config.filters,
        collectorPool: config.collectorPool,
        excludeCollectors: config.excludeCollectors,
        maxAssignmentsPerDay: config.maxAssignmentsPerDay,
        workloadThreshold: config.workloadThreshold,
        lastAssignedCollectorId: config.lastAssignedCollectorId,
        targetEntityId,
        targetEntityType,
        targetEntityData,
      },
      finalCorrelationId
    );
  }
}
```

#### Task 1.7: Create Auto-Assignment Trigger Listener (1.5 hours)
**File:** `src/events/listeners/auto-assignment-trigger.listener.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, EventEnvelope } from '@verichron/events';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoAssignmentConfig } from '../../auto-assignment/entities/auto-assignment-config.entity';
import { AutoAssignmentExecutorService } from '../../auto-assignment/auto-assignment-executor.service';
import { DebtCreatedDto } from '../event-dto/debts/debt-created.dto';
import { WorkflowTargetEntityType } from '@verichron/enums';

@Injectable()
export class AutoAssignmentTriggerListener {
  private readonly logger = new Logger(AutoAssignmentTriggerListener.name);

  constructor(
    @InjectRepository(AutoAssignmentConfig)
    private readonly autoAssignmentConfigRepository: Repository<AutoAssignmentConfig>,
    private readonly autoAssignmentExecutorService: AutoAssignmentExecutorService,
  ) {}

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_CREATED,
    subscriptionName: 'api-workflows-auto-assignment-debt-created',
  })
  async handleDebtCreated(envelope: EventEnvelope<DebtCreatedDto>): Promise<void> {
    const { organizationId, debtId, debtorId } = envelope.data;

    this.logger.log(`Processing debt-created event for auto-assignment: debt=${debtId}`);

    try {
      // Find all enabled auto-assignment configs for this organization
      const configs = await this.autoAssignmentConfigRepository.find({
        where: {
          organizationId,
          enabled: true,
          autoDisabled: false,
        },
      });

      if (configs.length === 0) {
        this.logger.debug(`No enabled auto-assignment configs found for org ${organizationId}`);
        return;
      }

      // Execute auto-assignment for each matching config
      for (const config of configs) {
        try {
          await this.autoAssignmentExecutorService.executeAutoAssignment({
            organizationId,
            configId: config.id,
            targetEntityId: debtId || debtorId,
            targetEntityType: debtId ? WorkflowTargetEntityType.DEBT : WorkflowTargetEntityType.DEBTOR,
            targetEntityData: envelope.data,
            correlationId: envelope.correlationId,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            `Failed to execute auto-assignment for config ${config.id}: ${errorMessage}`,
            errorStack
          );
          // Continue with other configs
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process debt-created event for auto-assignment: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }
}
```

#### Task 1.8: Update Auto-Assignment Module (30 min)
**File:** `src/auto-assignment/auto-assignment.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoAssignmentController } from './auto-assignment.controller';
import { AutoAssignmentService } from './auto-assignment.service';
import { AutoAssignmentExecutorService } from './auto-assignment-executor.service';
import { AutoAssignmentConfig } from './entities/auto-assignment-config.entity';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutoAssignmentConfig]),
    SchedulerModule,
  ],
  controllers: [AutoAssignmentController],
  providers: [
    AutoAssignmentService,
    AutoAssignmentExecutorService,
  ],
  exports: [AutoAssignmentService, AutoAssignmentExecutorService],
})
export class AutoAssignmentModule {}
```

#### Task 1.9: Register Listener in Events Module (15 min)
**File:** `src/events/events.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventPublisherModule } from '@verichron/event-publisher';
import { EventSubscriberModule } from '@verichron/event-subscriber';
import { AutoAssignmentModule } from '../auto-assignment/auto-assignment.module';
import { AutoAssignmentConfig } from '../auto-assignment/entities/auto-assignment-config.entity';
// ... other imports

import { AutoAssignmentTriggerListener } from './listeners/auto-assignment-trigger.listener';
// ... other listeners

@Module({
  imports: [
    EventPublisherModule,
    EventSubscriberModule,
    TypeOrmModule.forFeature([AutoAssignmentConfig]),
    AutoAssignmentModule,
    // ... other modules
  ],
  providers: [
    AutoAssignmentTriggerListener,
    // ... other listeners
  ],
})
export class EventsModule {}
```

---

## Day 2: Escalation & Result Tracking (8 hours)

### Morning: Escalation Command Publishing (4 hours)

#### Task 2.1: Create EscalationExecutorService (2 hours)
**File:** `src/escalation-rules/escalation-executor.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { EventPublisher } from '@verichron/event-publisher';
import { EscalationRulesService } from './escalation-rules.service';
import { EscalationExecution } from './entities/escalation-execution.entity';
import { EVENT_TOPICS, EVENT_TYPES, EVENT_SOURCES } from '@verichron/events';
import { WorkflowTargetEntityType } from '@verichron/enums';

interface ExecuteEscalationParams {
  organizationId: string;
  ruleId: string;
  targetEntityId: string;
  targetEntityType: WorkflowTargetEntityType;
  targetEntityData: any;
  correlationId?: string;
}

@Injectable()
export class EscalationExecutorService {
  private readonly logger = new Logger(EscalationExecutorService.name);

  constructor(
    private readonly escalationRulesService: EscalationRulesService,
    @InjectRepository(EscalationExecution)
    private readonly escalationExecutionRepository: Repository<EscalationExecution>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async executeEscalation(params: ExecuteEscalationParams): Promise<void> {
    const { organizationId, ruleId, targetEntityId, targetEntityType, targetEntityData, correlationId } = params;

    this.logger.log(
      `Executing escalation: rule=${ruleId}, target=${targetEntityId}, type=${targetEntityType}`
    );

    try {
      // Fetch escalation rule
      const rule = await this.escalationRulesService.findOne(organizationId, ruleId);

      // Check if rule is enabled
      if (!rule.enabled) {
        this.logger.debug(`Escalation rule ${ruleId} is disabled`);
        return;
      }

      // Check for recent execution within cooldown period
      const cooldownStart = new Date(Date.now() - rule.cooldownHours * 60 * 60 * 1000);
      const recentExecution = await this.escalationExecutionRepository.findOne({
        where: {
          organizationId,
          ruleId,
          targetEntityId,
          executedAt: MoreThan(cooldownStart),
        },
        order: { executedAt: 'DESC' },
      });

      if (recentExecution) {
        this.logger.debug(
          `Escalation ${ruleId} skipped - within ${rule.cooldownHours}h cooldown period (last executed: ${recentExecution.executedAt})`
        );
        return;
      }

      // Evaluate trigger conditions (if any)
      if (rule.triggerConditions && rule.triggerConditions.length > 0) {
        if (!this.evaluateConditions(rule.triggerConditions, targetEntityData)) {
          this.logger.debug(`Escalation ${ruleId} conditions not met for target ${targetEntityId}`);
          return;
        }
      }

      // Publish command to api-automations
      const finalCorrelationId = correlationId || `escalation-${ruleId}-${Date.now()}`;
      await this.eventPublisher.publish(
        EVENT_TOPICS.AUTOMATIONS,
        EVENT_TYPES.AUTOMATIONS_EXECUTE_ESCALATION,
        EVENT_SOURCES.WORKFLOWS,
        {
          organizationId,
          ruleId,
          ruleName: rule.name,
          triggerConditions: rule.triggerConditions,
          escalateTo: rule.escalateTo,
          escalationTargets: rule.escalationTargets,
          notificationMethods: rule.notificationMethods,
          priority: rule.priority,
          targetEntityId,
          targetEntityType,
          targetEntityData,
        },
        finalCorrelationId
      );

      // Record execution for deduplication
      await this.escalationExecutionRepository.save({
        organizationId,
        ruleId,
        targetEntityId,
        targetEntityType,
      });

      this.logger.log(`Escalation command published for rule ${ruleId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to execute escalation for rule ${ruleId}: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  private evaluateConditions(conditions: any[], targetEntityData: any): boolean {
    // Reuse condition evaluation logic from EngineService
    // For now, simple implementation - can be extracted to shared utility
    return conditions.every(condition => {
      const fieldValue = this.getNestedValue(targetEntityData, condition.field);
      if (fieldValue === undefined || fieldValue === null) {
        return false;
      }

      switch (condition.operator) {
        case 'EQUALS':
          return fieldValue === condition.value;
        case 'GREATER_THAN':
          return typeof fieldValue === 'number' && fieldValue > condition.value;
        case 'LESS_THAN':
          return typeof fieldValue === 'number' && fieldValue < condition.value;
        // Add other operators as needed
        default:
          return true;
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
}
```

#### Task 2.2: Create Escalation Trigger Listener (1.5 hours)
**File:** `src/events/listeners/escalation-trigger.listener.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, EventEnvelope } from '@verichron/events';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscalationRule } from '../../escalation-rules/entities/escalation-rule.entity';
import { EscalationExecutorService } from '../../escalation-rules/escalation-executor.service';
import { WorkflowTargetEntityType } from '@verichron/enums';

@Injectable()
export class EscalationTriggerListener {
  private readonly logger = new Logger(EscalationTriggerListener.name);

  constructor(
    @InjectRepository(EscalationRule)
    private readonly escalationRuleRepository: Repository<EscalationRule>,
    private readonly escalationExecutorService: EscalationExecutorService,
  ) {}

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_PROMISE_BROKEN,
    subscriptionName: 'api-workflows-escalation-promise-broken',
  })
  async handlePromiseBroken(envelope: EventEnvelope<any>): Promise<void> {
    await this.processEscalationTrigger(
      envelope.data.organizationId,
      envelope.data.debtorId || envelope.data.debtId,
      WorkflowTargetEntityType.DEBTOR,
      envelope.data,
      envelope.correlationId
    );
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_BALANCE_UPDATED,
    subscriptionName: 'api-workflows-escalation-balance-updated',
  })
  async handleBalanceUpdated(envelope: EventEnvelope<any>): Promise<void> {
    // Trigger escalation for high-balance accounts
    await this.processEscalationTrigger(
      envelope.data.organizationId,
      envelope.data.debtId,
      WorkflowTargetEntityType.DEBT,
      envelope.data,
      envelope.correlationId
    );
  }

  private async processEscalationTrigger(
    organizationId: string,
    targetEntityId: string,
    targetEntityType: WorkflowTargetEntityType,
    targetEntityData: any,
    correlationId?: string
  ): Promise<void> {
    this.logger.log(`Processing escalation trigger for ${targetEntityType} ${targetEntityId}`);

    try {
      // Find all enabled escalation rules
      const rules = await this.escalationRuleRepository.find({
        where: {
          organizationId,
          enabled: true,
        },
      });

      if (rules.length === 0) {
        this.logger.debug(`No enabled escalation rules found for org ${organizationId}`);
        return;
      }

      // Execute each matching rule
      for (const rule of rules) {
        try {
          await this.escalationExecutorService.executeEscalation({
            organizationId,
            ruleId: rule.id,
            targetEntityId,
            targetEntityType,
            targetEntityData,
            correlationId,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to execute escalation rule ${rule.id}: ${errorMessage}`
          );
          // Continue with other rules
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process escalation trigger: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }
}
```

#### Task 2.3: Update Escalation Module (30 min)
**File:** `src/escalation-rules/escalation-rules.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscalationRulesController } from './escalation-rules.controller';
import { EscalationRulesService } from './escalation-rules.service';
import { EscalationExecutorService } from './escalation-executor.service';
import { EscalationRule, EscalationExecution } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([EscalationRule, EscalationExecution]),
  ],
  controllers: [EscalationRulesController],
  providers: [
    EscalationRulesService,
    EscalationExecutorService,
  ],
  exports: [EscalationRulesService, EscalationExecutorService],
})
export class EscalationRulesModule {}
```

---

### Afternoon: Result Event Tracking (4 hours)

#### Task 2.4: Create Auto-Assignment Result Listener (2 hours)
**File:** `src/events/listeners/auto-assignment-result.listener.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, EventEnvelope } from '@verichron/events';
import { AutoAssignmentService } from '../../auto-assignment/auto-assignment.service';
import { WorkflowExecutionsService } from '../../workflow-executions/workflow-executions.service';
import { format } from 'date-fns';
import { WorkflowTargetEntityType, ActionExecutionStatus } from '@verichron/enums';

interface AutoAssignmentCompletedDto {
  organizationId: string;
  configId: string;
  configName: string;
  collectorUserId: string;
  targetEntityId: string;
  targetEntityType: string;
  strategy: string;
  executionTimeMs: number;
  correlationId?: string;
}

interface AutoAssignmentFailedDto {
  organizationId: string;
  configId: string;
  configName: string;
  targetEntityId: string;
  targetEntityType: string;
  error: string;
  strategy: string;
  correlationId?: string;
}

@Injectable()
export class AutoAssignmentResultListener {
  private readonly logger = new Logger(AutoAssignmentResultListener.name);

  constructor(
    private readonly autoAssignmentService: AutoAssignmentService,
    private readonly workflowExecutionsService: WorkflowExecutionsService,
  ) {}

  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED,
    subscriptionName: 'api-workflows-auto-assignment-result',
  })
  async handleAutoAssignmentCompleted(
    envelope: EventEnvelope<AutoAssignmentCompletedDto>
  ): Promise<void> {
    const { organizationId, configId, collectorUserId, targetEntityId, correlationId } = envelope.data;

    this.logger.log(`Auto-assignment completed: config=${configId}, collector=${collectorUserId}`);

    try {
      // Check for duplicate processing using correlationId
      if (correlationId) {
        const existing = await this.workflowExecutionsService['workflowExecutionRepository'].findOne({
          where: { organizationId, correlationId },
        });
        if (existing) {
          this.logger.debug(`Already processed result for correlationId ${correlationId}`);
          return;
        }
      }

      const config = await this.autoAssignmentService.findOne(organizationId, configId);

      // Reset failure counter on success
      config.consecutiveFailures = 0;

      // Update round-robin state
      config.lastAssignedCollectorId = collectorUserId;

      // Update daily counts
      const today = format(new Date(), 'yyyy-MM-dd');
      if (!config.dailyAssignmentCounts[collectorUserId]) {
        config.dailyAssignmentCounts[collectorUserId] = {};
      }
      config.dailyAssignmentCounts[collectorUserId][today] =
        (config.dailyAssignmentCounts[collectorUserId][today] || 0) + 1;

      // Increment total assignments
      config.totalAssignments += 1;

      await this.autoAssignmentService.update(organizationId, configId, config);

      // Create workflow execution record
      await this.workflowExecutionsService.createExecution(
        organizationId,
        configId,
        envelope.data.configName,
        'system',
        envelope.data.targetEntityType as WorkflowTargetEntityType,
        targetEntityId,
        undefined,
        [
          {
            actionId: 'auto-assign',
            actionType: `AUTO_ASSIGN_${envelope.data.strategy}`,
            status: ActionExecutionStatus.SUCCESS,
            result: `Assigned to collector ${collectorUserId}`,
            executedAt: new Date(),
            duration: envelope.data.executionTimeMs,
          },
        ],
        new Date(Date.now() - (envelope.data.executionTimeMs || 0)),
      );

      this.logger.log(`Auto-assignment result processed for config ${configId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process auto-assignment completed event: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_FAILED,
    subscriptionName: 'api-workflows-auto-assignment-failed',
  })
  async handleAutoAssignmentFailed(
    envelope: EventEnvelope<AutoAssignmentFailedDto>
  ): Promise<void> {
    const { organizationId, configId, error, targetEntityId, correlationId } = envelope.data;

    this.logger.warn(`Auto-assignment failed: config=${configId}, error=${error}`);

    try {
      // Check for duplicate processing
      if (correlationId) {
        const existing = await this.workflowExecutionsService['workflowExecutionRepository'].findOne({
          where: { organizationId, correlationId },
        });
        if (existing) {
          this.logger.debug(`Already processed failure for correlationId ${correlationId}`);
          return;
        }
      }

      const config = await this.autoAssignmentService.findOne(organizationId, configId);

      // Increment consecutive failures
      config.consecutiveFailures += 1;

      // Auto-disable after 5 consecutive failures
      if (config.consecutiveFailures >= 5 && config.enabled && !config.autoDisabled) {
        config.enabled = false;
        config.autoDisabled = true;
        config.autoDisabledAt = new Date();
        config.autoDisabledReason = `Auto-disabled after 5 consecutive failures. Last error: ${error}`;

        // TODO: Send alert to managers via WORKFLOWS_CONFIG_AUTO_DISABLED event
        this.logger.warn(`Auto-disabled config ${configId} after 5 failures`);
      }

      await this.autoAssignmentService.update(organizationId, configId, config);

      // Create failed execution record
      await this.workflowExecutionsService.createExecution(
        organizationId,
        configId,
        envelope.data.configName,
        'system',
        envelope.data.targetEntityType as WorkflowTargetEntityType,
        targetEntityId,
        undefined,
        [
          {
            actionId: 'auto-assign',
            actionType: `AUTO_ASSIGN_${envelope.data.strategy}`,
            status: ActionExecutionStatus.FAILED,
            error,
            executedAt: new Date(),
          },
        ],
        new Date(),
      );

      this.logger.log(`Auto-assignment failure processed for config ${configId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process auto-assignment failed event: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }
}
```

#### Task 2.5: Create Escalation Result Listener (1.5 hours)
**File:** `src/events/listeners/escalation-result.listener.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, EventEnvelope } from '@verichron/events';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscalationRule } from '../../escalation-rules/entities/escalation-rule.entity';
import { WorkflowExecutionsService } from '../../workflow-executions/workflow-executions.service';
import { WorkflowTargetEntityType, ActionExecutionStatus } from '@verichron/enums';

interface EscalationCompletedDto {
  organizationId: string;
  ruleId: string;
  ruleName: string;
  targetEntityId: string;
  targetEntityType: string;
  notificationsSent: string[];
  executionTimeMs: number;
  correlationId?: string;
}

interface EscalationFailedDto {
  organizationId: string;
  ruleId: string;
  ruleName: string;
  targetEntityId: string;
  targetEntityType: string;
  error: string;
  correlationId?: string;
}

@Injectable()
export class EscalationResultListener {
  private readonly logger = new Logger(EscalationResultListener.name);

  constructor(
    @InjectRepository(EscalationRule)
    private readonly escalationRuleRepository: Repository<EscalationRule>,
    private readonly workflowExecutionsService: WorkflowExecutionsService,
  ) {}

  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_ESCALATION_COMPLETED,
    subscriptionName: 'api-workflows-escalation-result',
  })
  async handleEscalationCompleted(
    envelope: EventEnvelope<EscalationCompletedDto>
  ): Promise<void> {
    const { organizationId, ruleId, targetEntityId, correlationId } = envelope.data;

    this.logger.log(`Escalation completed: rule=${ruleId}, notifications=${envelope.data.notificationsSent.join(', ')}`);

    try {
      // Check for duplicate processing
      if (correlationId) {
        const existing = await this.workflowExecutionsService['workflowExecutionRepository'].findOne({
          where: { organizationId, correlationId },
        });
        if (existing) {
          this.logger.debug(`Already processed result for correlationId ${correlationId}`);
          return;
        }
      }

      // Update execution count
      await this.escalationRuleRepository.increment(
        { id: ruleId, organizationId },
        'executionCount',
        1
      );

      // Create workflow execution record
      await this.workflowExecutionsService.createExecution(
        organizationId,
        ruleId,
        envelope.data.ruleName,
        'system',
        envelope.data.targetEntityType as WorkflowTargetEntityType,
        targetEntityId,
        undefined,
        [
          {
            actionId: 'escalate',
            actionType: 'ESCALATE_TO_MANAGER',
            status: ActionExecutionStatus.SUCCESS,
            result: `Notifications sent: ${envelope.data.notificationsSent.join(', ')}`,
            executedAt: new Date(),
            duration: envelope.data.executionTimeMs,
          },
        ],
        new Date(Date.now() - (envelope.data.executionTimeMs || 0)),
      );

      this.logger.log(`Escalation result processed for rule ${ruleId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process escalation completed event: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_ESCALATION_FAILED,
    subscriptionName: 'api-workflows-escalation-failed',
  })
  async handleEscalationFailed(
    envelope: EventEnvelope<EscalationFailedDto>
  ): Promise<void> {
    const { organizationId, ruleId, error, targetEntityId, correlationId } = envelope.data;

    this.logger.warn(`Escalation failed: rule=${ruleId}, error=${error}`);

    try {
      // Check for duplicate processing
      if (correlationId) {
        const existing = await this.workflowExecutionsService['workflowExecutionRepository'].findOne({
          where: { organizationId, correlationId },
        });
        if (existing) {
          this.logger.debug(`Already processed failure for correlationId ${correlationId}`);
          return;
        }
      }

      // Create failed execution record
      await this.workflowExecutionsService.createExecution(
        organizationId,
        ruleId,
        envelope.data.ruleName,
        'system',
        envelope.data.targetEntityType as WorkflowTargetEntityType,
        targetEntityId,
        undefined,
        [
          {
            actionId: 'escalate',
            actionType: 'ESCALATE_TO_MANAGER',
            status: ActionExecutionStatus.FAILED,
            error,
            executedAt: new Date(),
          },
        ],
        new Date(),
      );

      this.logger.log(`Escalation failure processed for rule ${ruleId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process escalation failed event: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }
}
```

#### Task 2.6: Register Result Listeners (30 min)
Update `src/events/events.module.ts` to include both result listeners.

---

## Day 3: Testing & Documentation (8 hours)

### Morning: Integration Testing (4 hours)

#### Task 3.1: End-to-End Auto-Assignment Test (2 hours)
**File:** `test/integration/auto-assignment.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { EventPublisher } from '@verichron/event-publisher';
import { AutoAssignmentStrategy } from '@verichron/enums';

describe('Auto-Assignment Integration (e2e)', () => {
  let app: INestApplication;
  let eventPublisher: EventPublisher;
  let authToken: string;
  let organizationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    eventPublisher = app.get<EventPublisher>(EventPublisher);

    // Setup test auth token and organization
    // authToken = await getTestAuthToken();
    // organizationId = await getTestOrganizationId();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create auto-assignment config via API', async () => {
    const response = await request(app.getHttpServer())
      .post('/workflows/auto-assignment')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Round Robin Assignment',
        strategy: AutoAssignmentStrategy.ROUND_ROBIN,
        filters: {
          balanceRange: [100, 10000],
        },
        collectorPool: ['collector-1', 'collector-2', 'collector-3'],
        enabled: true,
      })
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe('Test Round Robin Assignment');
    expect(response.body.strategy).toBe(AutoAssignmentStrategy.ROUND_ROBIN);
  });

  it('should trigger auto-assignment when debt is created', async () => {
    // Mock event publisher to capture published commands
    const publishSpy = jest.spyOn(eventPublisher, 'publish');

    // Simulate debt-created event
    await eventPublisher.publish(
      'debts',
      'debts.debt-created',
      'api-debts',
      {
        organizationId,
        debtId: 'test-debt-1',
        debtorId: 'test-debtor-1',
        balance: 5000,
      }
    );

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT was published
    expect(publishSpy).toHaveBeenCalledWith(
      'automations',
      'automations.execute_auto_assignment',
      'api-workflows',
      expect.objectContaining({
        organizationId,
        strategy: AutoAssignmentStrategy.ROUND_ROBIN,
      }),
      expect.any(String) // correlationId
    );
  });

  it('should track auto-assignment result and update config', async () => {
    // Simulate completion event from api-automations
    await eventPublisher.publish(
      'automations',
      'automations.auto_assignment_completed',
      'api-automations',
      {
        organizationId,
        configId: 'test-config-1',
        configName: 'Test Round Robin Assignment',
        collectorUserId: 'collector-1',
        targetEntityId: 'test-debt-1',
        targetEntityType: 'DEBT',
        strategy: 'ROUND_ROBIN',
        executionTimeMs: 250,
      }
    );

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify config was updated
    const response = await request(app.getHttpServer())
      .get(`/workflows/auto-assignment/test-config-1`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.lastAssignedCollectorId).toBe('collector-1');
    expect(response.body.totalAssignments).toBeGreaterThan(0);
    expect(response.body.consecutiveFailures).toBe(0);
  });

  // Add more test cases...
});
```

#### Task 3.2: End-to-End Escalation Test (2 hours)
Similar structure for escalation flow testing.

---

### Afternoon: Documentation & Code Review (4 hours)

#### Task 3.3: Update README (1 hour)
Update `apps/api-workflows/README.md` with:
- Auto-assignment executor documentation
- Escalation executor documentation
- Event flow diagrams
- Configuration examples

#### Task 3.4: Add Inline Documentation (1 hour)
- Add JSDoc comments to all new services
- Document complex logic (filter validation, condition evaluation, etc.)
- Add usage examples

#### Task 3.5: Code Review & Cleanup (2 hours)
- Review all code for consistency
- Check error handling coverage
- Verify all TypeScript types are correct
- Run linter and fix issues
- Run unit tests and fix failures

---

## Success Criteria Checklist

### Phase 1 Complete When:
- [ ] All database migrations run successfully
- [ ] AutoAssignmentConfig entity has new fields (consecutiveFailures, autoDisabled, etc.)
- [ ] EscalationExecution table created
- [ ] AutoAssignmentExecutorService publishes commands to api-automations
- [ ] Auto-assignment triggers on debt-created events
- [ ] EscalationExecutorService publishes commands to api-automations
- [ ] Escalation triggers on promise-broken events
- [ ] Auto-assignment result events update config state (lastAssignedCollectorId, totalAssignments, etc.)
- [ ] Failed auto-assignments auto-disable after 5 failures
- [ ] Escalation cooldown prevents duplicate escalations
- [ ] All result events create workflow execution records
- [ ] GET /workflows/executions returns execution history
- [ ] GET /workflows/analytics shows auto-assignment and escalation metrics
- [ ] Integration tests pass
- [ ] Documentation updated

---

## Commands Reference

### Run Migrations
```bash
cd apps/api-workflows
npm run migration:run
```

### Generate New Migration
```bash
npm run migration:generate -- -n MigrationName
```

### Run Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# With coverage
npm run test:cov
```

### Start Service
```bash
npm run start:dev
```

---

## Notes & Tips

1. **Incremental Testing:** Test each component as you build it - don't wait until the end
2. **Event Payload Validation:** Use DTOs to validate all event payloads
3. **Idempotency:** Always check correlationId to prevent duplicate processing
4. **Error Handling:** Log detailed errors but don't throw unless critical
5. **Rate Limiting:** The assignment rate limiter is per-org, not global
6. **Cooldown Tracking:** EscalationExecution table is append-only - don't delete old records
7. **Transaction Safety:** Consider adding transactions for critical state updates

---

**Status:** Ready to Execute
**Estimated Completion:** End of Day 3
**Blocker:** None - all dependencies met
