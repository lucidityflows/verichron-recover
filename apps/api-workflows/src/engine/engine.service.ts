import { Injectable, Logger } from '@nestjs/common';
import { WorkflowRulesService } from '../workflow-rules/workflow-rules.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { WorkflowExecutionsService } from '../workflow-executions/workflow-executions.service';
import { CommandsService } from '../commands/commands.service';
import { WorkflowRuleResponseDto } from '../workflow-rules/dto/workflow-rule-response.dto';
import { WorkflowCondition } from '@verichron/contracts';
import { WorkflowConditionOperator, ActionExecutionStatus, WorkflowTargetEntityType, WorkflowPriority } from '@verichron/enums';
import { ActionExecution } from '../workflow-executions/entities/workflow-execution.entity';

@Injectable()
export class EngineService {
  private readonly logger = new Logger(EngineService.name);

  constructor(
    private readonly workflowRulesService: WorkflowRulesService,
    private readonly schedulerService: SchedulerService,
    private readonly workflowExecutionsService: WorkflowExecutionsService,
    private readonly commandsService: CommandsService,
  ) {}

  /**
   * Main entry point for evaluating and executing workflows.
   * Can be triggered by events or scheduled jobs.
   * @param organizationId The ID of the organization.
   * @param eventPayload The event that triggered this evaluation (or context for scheduled job).
   */
  async processWorkflowTrigger(organizationId: string, eventPayload: any): Promise<void> {
    const startTime = new Date();
    
    this.logger.debug(
      `Processing workflow trigger for org: ${organizationId} with payload: ${JSON.stringify(eventPayload)}`
    );

    try {
      // Get all active rules for this organization
      const activeRules = await this.workflowRulesService.findAll(organizationId);
      const enabledRules = activeRules.filter((r) => r.enabled);

      // Sort by priority (lower number = higher priority)
      const priorityMap: Record<WorkflowPriority, number> = {
        [WorkflowPriority.LOW]: 1,
        [WorkflowPriority.MEDIUM]: 2,
        [WorkflowPriority.HIGH]: 3,
        [WorkflowPriority.CRITICAL]: 4,
      };
      const sortedRules = enabledRules.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);

      // Evaluate each rule
      for (const rule of sortedRules) {
        try {
          if (this.checkConditions(rule.conditions, eventPayload)) {
            this.logger.log(`Rule "${rule.name}" triggered for org ${organizationId}`);
            await this.executeActions(rule, organizationId, eventPayload, startTime);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            `Error evaluating rule "${rule.name}": ${errorMessage}`,
            errorStack
          );
          // Continue to next rule
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Fatal error processing workflow trigger for org ${organizationId}: ${errorMessage}`,
        errorStack
      );
      throw error;
    }
  }

  /**
   * Evaluate all conditions for a rule
   * Returns true if ALL conditions are met (AND logic)
   */
  private checkConditions(conditions: WorkflowCondition[], payload: any): boolean {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions means always execute
    }

    return conditions.every((condition) => {
      try {
        return this.evaluateCondition(condition, payload);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Error evaluating condition for field "${condition.field}": ${errorMessage}`
        );
        return false;
      }
    });
  }

  /**
   * Evaluate a single condition against the payload
   */
  private evaluateCondition(condition: WorkflowCondition, payload: any): boolean {
    // Access payload field dynamically (supports nested fields with dot notation)
    const payloadValue = this.getNestedValue(payload, condition.field);

    if (payloadValue === undefined || payloadValue === null) {
      this.logger.debug(
        `Condition field "${condition.field}" not found in payload for operator ${condition.operator}.`
      );
      return false;
    }

    switch (condition.operator) {
      case WorkflowConditionOperator.EQUALS:
        return payloadValue === condition.value;

      case WorkflowConditionOperator.NOT_EQUALS:
        return payloadValue !== condition.value;

      case WorkflowConditionOperator.GREATER_THAN:
        return typeof payloadValue === 'number' && 
               typeof condition.value === 'number' && 
               payloadValue > condition.value;

      case WorkflowConditionOperator.LESS_THAN:
        return typeof payloadValue === 'number' && 
               typeof condition.value === 'number' && 
               payloadValue < condition.value;

      case WorkflowConditionOperator.GREATER_THAN_OR_EQUAL:
        return typeof payloadValue === 'number' && 
               typeof condition.value === 'number' && 
               payloadValue >= condition.value;

      case WorkflowConditionOperator.LESS_THAN_OR_EQUAL:
        return typeof payloadValue === 'number' && 
               typeof condition.value === 'number' && 
               payloadValue <= condition.value;

      case WorkflowConditionOperator.CONTAINS:
        if (typeof payloadValue === 'string' && typeof condition.value === 'string') {
          return payloadValue.toLowerCase().includes(condition.value.toLowerCase());
        }
        if (Array.isArray(payloadValue)) {
          return payloadValue.includes(condition.value);
        }
        return false;

      case WorkflowConditionOperator.NOT_CONTAINS:
        if (typeof payloadValue === 'string' && typeof condition.value === 'string') {
          return !payloadValue.toLowerCase().includes(condition.value.toLowerCase());
        }
        if (Array.isArray(payloadValue)) {
          return !payloadValue.includes(condition.value);
        }
        return false;

      case WorkflowConditionOperator.BETWEEN:
        if (typeof payloadValue === 'number' && Array.isArray(condition.value) && condition.value.length === 2) {
          const [min, max] = condition.value;
          return payloadValue >= min && payloadValue <= max;
        }
        return false;

      case WorkflowConditionOperator.IN:
        if (Array.isArray(condition.value)) {
          return condition.value.includes(payloadValue);
        }
        return false;

      case WorkflowConditionOperator.NOT_IN:
        if (Array.isArray(condition.value)) {
          return !condition.value.includes(payloadValue);
        }
        return false;

      default:
        this.logger.warn(`Unknown condition operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   * e.g., getNestedValue(obj, 'user.profile.name')
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Execute all actions for a rule
   */
  private async executeActions(
    rule: WorkflowRuleResponseDto,
    organizationId: string,
    eventPayload: any,
    startTime: Date,
  ): Promise<void> {
    const actionsExecuted: ActionExecution[] = [];

    // Determine target entity from eventPayload
    const targetEntityId = eventPayload.debtorId || eventPayload.debtId || eventPayload.accountId || 
                          eventPayload.targetEntityId || eventPayload.entityId || 'unknown';
    const targetEntityType = (eventPayload.targetEntityType || 'DEBTOR') as WorkflowTargetEntityType;
    const targetEntityName = eventPayload.debtorName || eventPayload.accountName || eventPayload.entityName;

    // Sort actions by order
    const sortedActions = [...rule.actions].sort((a, b) => a.order - b.order);

    // Execute actions
    for (const action of sortedActions) {
      const actionStartTime = new Date();
      const actionExecution: ActionExecution = {
        actionId: action.id,
        actionType: action.type,
        status: ActionExecutionStatus.FAILED, // Default to failed
        executedAt: actionStartTime,
      };

      try {
        // Check for delay
        const delayDays = action.config?.delayDays ?? action.config?.delay ?? 0;
        
        if (delayDays > 0) {
          // Schedule for later
          await this.schedulerService.addWorkflowActionJob(
            organizationId,
            rule.id,
            rule.name,
            action,
            targetEntityId,
            targetEntityType,
            eventPayload,
            delayDays * 24 * 60 * 60 * 1000 // Convert days to ms
          );

          // Success (Scheduled)
          actionExecution.status = ActionExecutionStatus.SUCCESS;
          actionExecution.result = `${action.type} scheduled with ${delayDays} day delay`;
          this.logger.log(`Action "${action.type}" for rule "${rule.name}" scheduled successfully.`);
        } else {
          // Execute immediately
          await this.commandsService.publishCommand(
            organizationId,
            action,
            targetEntityId,
            targetEntityType,
            eventPayload,
          );

          // Success
          actionExecution.status = ActionExecutionStatus.SUCCESS;
          actionExecution.result = `${action.type} executed successfully`;
          this.logger.log(`Action "${action.type}" for rule "${rule.name}" executed successfully.`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        // Failure
        actionExecution.status = ActionExecutionStatus.FAILED;
        actionExecution.error = errorMessage;
        this.logger.error(
          `Error executing action "${action.type}" for rule "${rule.name}": ${errorMessage}`,
          errorStack
        );
        // Continue to next action unless it's critical
      } finally {
        // Calculate action duration
        const actionEndTime = new Date();
        actionExecution.duration = actionEndTime.getTime() - actionStartTime.getTime();
        actionsExecuted.push(actionExecution);
      }
    }

    // Log workflow execution history
    try {
      await this.workflowExecutionsService.createExecution(
        organizationId,
        rule.id,
        rule.name,
        eventPayload.triggeredBy || eventPayload.userId || 'system',
        targetEntityType,
        targetEntityId,
        targetEntityName,
        actionsExecuted,
        startTime,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to log workflow execution for rule "${rule.name}": ${errorMessage}`,
        errorStack
      );
      // Don't throw - this is just logging
    }
  }
}