import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { WORKFLOW_QUEUE_NAME } from './scheduler.service';
import { EngineService } from '../engine/engine.service';
import { WorkflowRulesService } from '../workflow-rules/workflow-rules.service';
import { AutoAssignmentService } from '../auto-assignment/auto-assignment.service';
import { AutoAssignmentExecutorService } from '../auto-assignment/auto-assignment-executor.service';
import { EscalationRulesService } from '../escalation-rules/escalation-rules.service';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { ExecuteScheduledAutoAssignmentDto, ExecuteEscalationDto } from '../events/event-dto';
import { CommandsService } from '../commands/commands.service';

@Processor(WORKFLOW_QUEUE_NAME)
export class SchedulerProcessor extends WorkerHost {
  private readonly logger = new Logger(SchedulerProcessor.name);

  constructor(
    @InjectQueue(WORKFLOW_QUEUE_NAME) private readonly workflowQueue: Queue,
    private readonly engineService: EngineService,
    private readonly workflowRulesService: WorkflowRulesService,
    private readonly autoAssignmentService: AutoAssignmentService,
    private readonly autoAssignmentExecutor: AutoAssignmentExecutorService,
    private readonly escalationRulesService: EscalationRulesService,
    private readonly eventPublisher: EventPublisher,
    private readonly commandsService: CommandsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data: ${JSON.stringify(job.data)}`
    );

    try {
      switch (job.name) {
        case 'evaluate-rule':
          await this.evaluateRule(job.data);
          break;
        case 'run-auto-assignment':
          await this.runAutoAssignment(job.data);
          break;
        case 'run-escalation':
          await this.runEscalation(job.data);
          break;
        case 'execute-workflow-action':
          await this.executeWorkflowAction(job.data);
          break;
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
          throw new Error(`Unknown job type: ${job.name}`);
      }

      this.logger.log(`Job ${job.id} of type ${job.name} completed.`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Job ${job.id} of type ${job.name} failed with error: ${errorMessage}`,
        errorStack
      );
      throw error; // Re-throw to trigger retry logic
    }
  }

  /**
   * Execute a specific workflow action after a delay
   *
   * ARCHITECTURE: api-workflows is the "brain" - decides WHEN to execute
   * Verification logic is in api-automations (the "hand") - decides HOW to execute safely
   *
   * Flow:
   * 1. Publish command to api-automations (fire-and-forget)
   * 2. api-automations verifies debt status and conditionally executes
   * 3. api-automations publishes result event
   * 4. AutomationResultListener logs skipped/completed actions for audit trail
   */
  private async executeWorkflowAction(data: {
    organizationId: string;
    ruleId: string;
    ruleName: string;
    action: any;
    targetEntityId: string;
    targetEntityType: string;
    eventPayload: any;
  }): Promise<void> {
    const { organizationId, ruleId, ruleName, action, targetEntityId, targetEntityType, eventPayload } = data;

    this.logger.debug(
      `Publishing delayed action ${action.type} for rule ${ruleId} on ${targetEntityType} ${targetEntityId}`
    );

    try {
      // Publish command to api-automations (fire-and-forget)
      // Verification and execution happen in api-automations
      await this.commandsService.publishCommand(
        organizationId,
        action,
        targetEntityId,
        targetEntityType,
        eventPayload
      );

      this.logger.log(
        `✅ Published delayed action ${action.type} for rule ${ruleId} on ${targetEntityType} ${targetEntityId}`
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to publish delayed action ${action.type} for rule ${ruleId}: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Evaluate a specific workflow rule
   * This is triggered by scheduled jobs or on-demand evaluation
   * 
   * IMPLEMENTATION: Creates a synthetic event payload for time-based rule evaluation
   */
  private async evaluateRule(data: { organizationId: string; ruleId: string }): Promise<void> {
    const { organizationId, ruleId } = data;

    this.logger.debug(`Evaluating rule ${ruleId} for organization ${organizationId}`);

    try {
      // Get the rule
      const rule = await this.workflowRulesService.findOne(organizationId, ruleId);

      if (!rule.enabled) {
        this.logger.debug(`Rule ${ruleId} is disabled, skipping evaluation`);
        return;
      }

      // Create a more detailed synthetic event payload for scheduled evaluation
      const eventPayload = {
        eventType: 'SCHEDULED_EVALUATION',
        eventSource: 'workflows',
        eventId: `scheduled-eval-${Date.now()}`,
        timestamp: new Date().toISOString(),
        correlationId: `rule-eval-${ruleId}-${Date.now()}`,
        organizationId,
        ruleId,
        ruleName: rule.name,
        triggeredBy: 'scheduler',
        // Include rule metadata for condition evaluation
        triggerType: rule.triggerType,
        // Placeholder for actual entity data - would be populated by orchestrator
        // For time-based rules, we'd query entities matching conditions
        targetEntityId: 'scheduled-evaluation',
        targetEntityType: 'SYSTEM',
      };

      // Process the workflow trigger
      // The engine will evaluate conditions and execute actions if they match
      await this.engineService.processWorkflowTrigger(organizationId, eventPayload);
      
      this.logger.log(`Successfully evaluated rule ${ruleId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error evaluating rule ${ruleId} for organization ${organizationId}: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  /**
   * Trigger scheduled auto-assignment for a configuration
   *
   * IMPLEMENTATION:
   * Publishes EXECUTE_SCHEDULED_AUTO_ASSIGNMENT command to api-automations.
   * api-automations will:
   * 1. Query unassigned entities via event-orchestrator
   * 2. Filter entities by config filters
   * 3. Execute assignment for each matching entity
   */
  private async runAutoAssignment(data: { organizationId: string; configId: string }): Promise<void> {
    const { organizationId, configId } = data;

    this.logger.debug(`Triggering scheduled auto-assignment ${configId} for organization ${organizationId}`);

    try {
      // Get the auto-assignment configuration
      const config = await this.autoAssignmentService.findOne(organizationId, configId);

      if (!config.enabled) {
        this.logger.debug(`Auto-assignment config ${configId} is disabled, skipping`);
        return;
      }

      // Publish scheduled auto-assignment command to api-automations
      // api-automations will query unassigned items and execute assignments
      const correlationId = `scheduled-assignment-${configId}-${Date.now()}`;

      await this.eventPublisher.publish(
        EVENT_TYPES.AUTOMATIONS_EXECUTE_SCHEDULED_AUTO_ASSIGNMENT,
        {
          organizationId,
          configId,
          configName: config.name,
          strategy: config.strategy,
          collectorPool: config.collectorPool,
          excludeCollectors: config.excludeCollectors,
          maxAssignmentsPerDay: config.maxAssignmentsPerDay,
          workloadThreshold: config.workloadThreshold,
          lastAssignedCollectorId: config.lastAssignedCollectorId,
          dailyAssignmentCounts: config.dailyAssignmentCounts,
          filters: config.filters,
        },
        ExecuteScheduledAutoAssignmentDto,
        { correlationId }
      );

      this.logger.log(
        `Published scheduled auto-assignment command for config ${configId} (correlationId: ${correlationId})`
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error running auto-assignment ${configId} for organization ${organizationId}: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  /**
   * Trigger escalation rule execution
   *
   * IMPLEMENTATION:
   * Publishes EXECUTE_ESCALATION command to api-automations.
   * api-automations will:
   * 1. Query entity data via event-orchestrator
   * 2. Evaluate escalation conditions
   * 3. Send notifications if conditions are met
   */
  private async runEscalation(data: {
    organizationId: string;
    ruleId: string;
    targetEntityId: string;
  }): Promise<void> {
    const { organizationId, ruleId, targetEntityId } = data;

    this.logger.debug(
      `Triggering escalation ${ruleId} for organization ${organizationId} on entity ${targetEntityId}`
    );

    try {
      // Get the escalation rule
      const rule = await this.escalationRulesService.findOne(organizationId, ruleId);

      if (!rule.enabled) {
        this.logger.debug(`Escalation rule ${ruleId} is disabled, skipping`);
        return;
      }

      // Publish escalation command to api-automations
      // api-automations will query entity data and execute escalation
      const correlationId = `escalation-${ruleId}-${Date.now()}`;

      await this.eventPublisher.publish(
        EVENT_TYPES.AUTOMATIONS_EXECUTE_ESCALATION,
        {
          organizationId,
          ruleId,
          ruleName: rule.name,
          targetEntityId,
          targetEntityType: 'DEBT', // TODO: This should come from job data
          triggerConditions: rule.triggerConditions,
          escalateTo: rule.escalateTo,
          escalationTargets: rule.escalationTargets,
          notificationMethods: rule.notificationMethods,
          priority: rule.priority,
        },
        ExecuteEscalationDto,
        { correlationId }
      );

      this.logger.log(
        `Published escalation command for rule ${ruleId} (correlationId: ${correlationId})`
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error running escalation ${ruleId} for organization ${organizationId}: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} has completed!`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} has failed with error: ${err.message}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Job ${job.id} has started!`);
  }
}