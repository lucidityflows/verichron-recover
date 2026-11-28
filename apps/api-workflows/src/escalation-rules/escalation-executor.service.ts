import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { EventPublisher } from '@verichron/event-publisher';
import { EscalationRulesService } from './escalation-rules.service';
import { EscalationExecution } from './entities/escalation-execution.entity';
import { EVENT_TYPES } from '@verichron/events';
import { ExecuteEscalationDto } from '../events/event-dto';
import { WorkflowTargetEntityType, WorkflowConditionOperator } from '@verichron/enums';
import { v4 as uuidv4 } from 'uuid';

export interface ExecuteEscalationParams {
  organizationId: string;
  ruleId: string;
  targetEntityId: string;
  targetEntityType: WorkflowTargetEntityType;
  targetEntityData: any;
  correlationId?: string;
}

export interface EscalationResult {
  success: boolean;
  ruleId: string;
  targetEntityId: string;
  commandPublished: boolean;
  correlationId?: string;
  error?: string;
  skippedReason?: string;
}

/**
 * EscalationExecutorService
 *
 * Responsible for executing escalation logic:
 * 1. Validates rule is enabled
 * 2. Checks cooldown period to prevent duplicate escalations
 * 3. Evaluates trigger conditions against target entity data
 * 4. Publishes AUTOMATIONS_EXECUTE_ESCALATION command to api-automations
 * 5. Records execution for deduplication tracking
 *
 * This service does NOT send notifications directly - it delegates to api-automations
 * which handles multi-channel notification routing.
 */
@Injectable()
export class EscalationExecutorService {
  private readonly logger = new Logger(EscalationExecutorService.name);

  constructor(
    private readonly escalationRulesService: EscalationRulesService,
    @InjectRepository(EscalationExecution)
    private readonly escalationExecutionRepository: Repository<EscalationExecution>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Execute escalation for a target entity
   */
  async executeEscalation(params: ExecuteEscalationParams): Promise<EscalationResult> {
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
        return {
          success: false,
          ruleId,
          targetEntityId,
          commandPublished: false,
          skippedReason: 'Rule is disabled',
        };
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
        const hoursSinceLastExecution = Math.floor(
          (Date.now() - recentExecution.executedAt.getTime()) / (1000 * 60 * 60)
        );
        this.logger.debug(
          `Escalation ${ruleId} skipped - within ${rule.cooldownHours}h cooldown period ` +
          `(last executed ${hoursSinceLastExecution}h ago at ${recentExecution.executedAt})`
        );
        return {
          success: false,
          ruleId,
          targetEntityId,
          commandPublished: false,
          skippedReason: `Within cooldown period (${hoursSinceLastExecution}h since last execution)`,
        };
      }

      // Evaluate trigger conditions (if any)
      if (rule.triggerConditions && rule.triggerConditions.length > 0) {
        if (!this.evaluateConditions(rule.triggerConditions, targetEntityData)) {
          this.logger.debug(`Escalation ${ruleId} conditions not met for target ${targetEntityId}`);
          return {
            success: false,
            ruleId,
            targetEntityId,
            commandPublished: false,
            skippedReason: 'Trigger conditions not met',
          };
        }
      }

      // Publish command to api-automations
      const finalCorrelationId = await this.publishEscalationCommand(
        rule,
        targetEntityId,
        targetEntityType,
        targetEntityData,
        correlationId
      );

      // Record execution for deduplication
      await this.escalationExecutionRepository.save({
        organizationId,
        ruleId,
        targetEntityId,
        targetEntityType,
      });

      this.logger.log(`Escalation command published for rule ${ruleId}`);

      return {
        success: true,
        ruleId,
        targetEntityId,
        commandPublished: true,
        correlationId: finalCorrelationId,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to execute escalation for rule ${ruleId}: ${errorMessage}`,
        errorStack
      );
      return {
        success: false,
        ruleId,
        targetEntityId,
        commandPublished: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Evaluate trigger conditions against target entity data
   * Returns true if ALL conditions are met (AND logic)
   */
  private evaluateConditions(conditions: any[], targetEntityData: any): boolean {
    return conditions.every(condition => {
      try {
        const fieldValue = this.getNestedValue(targetEntityData, condition.field);

        if (fieldValue === undefined || fieldValue === null) {
          this.logger.debug(`Condition field "${condition.field}" not found in target data`);
          return false;
        }

        return this.evaluateCondition(condition, fieldValue);
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
   * Evaluate a single condition
   */
  private evaluateCondition(condition: any, fieldValue: any): boolean {
    switch (condition.operator) {
      case WorkflowConditionOperator.EQUALS:
        return fieldValue === condition.value;

      case WorkflowConditionOperator.NOT_EQUALS:
        return fieldValue !== condition.value;

      case WorkflowConditionOperator.GREATER_THAN:
        return typeof fieldValue === 'number' &&
               typeof condition.value === 'number' &&
               fieldValue > condition.value;

      case WorkflowConditionOperator.LESS_THAN:
        return typeof fieldValue === 'number' &&
               typeof condition.value === 'number' &&
               fieldValue < condition.value;

      case WorkflowConditionOperator.GREATER_THAN_OR_EQUAL:
        return typeof fieldValue === 'number' &&
               typeof condition.value === 'number' &&
               fieldValue >= condition.value;

      case WorkflowConditionOperator.LESS_THAN_OR_EQUAL:
        return typeof fieldValue === 'number' &&
               typeof condition.value === 'number' &&
               fieldValue <= condition.value;

      case WorkflowConditionOperator.CONTAINS:
        if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
          return fieldValue.toLowerCase().includes(condition.value.toLowerCase());
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(condition.value);
        }
        return false;

      case WorkflowConditionOperator.NOT_CONTAINS:
        if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
          return !fieldValue.toLowerCase().includes(condition.value.toLowerCase());
        }
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(condition.value);
        }
        return false;

      case WorkflowConditionOperator.BETWEEN:
        if (typeof fieldValue === 'number' && Array.isArray(condition.value) && condition.value.length === 2) {
          const [min, max] = condition.value;
          return fieldValue >= min && fieldValue <= max;
        }
        return false;

      case WorkflowConditionOperator.IN:
        if (Array.isArray(condition.value)) {
          return condition.value.includes(fieldValue);
        }
        return false;

      case WorkflowConditionOperator.NOT_IN:
        if (Array.isArray(condition.value)) {
          return !condition.value.includes(fieldValue);
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
   * Publish AUTOMATIONS_EXECUTE_ESCALATION command to api-automations
   */
  private async publishEscalationCommand(
    rule: any,
    targetEntityId: string,
    targetEntityType: WorkflowTargetEntityType,
    targetEntityData: any,
    correlationId?: string
  ): Promise<string> {
    const finalCorrelationId = correlationId || uuidv4();

    this.logger.debug(
      `Publishing escalation command: rule=${rule.name}, correlationId=${finalCorrelationId}`
    );

    await this.eventPublisher.publish(
      EVENT_TYPES.AUTOMATIONS_EXECUTE_ESCALATION,
      {
        organizationId: rule.organizationId,
        ruleId: rule.id,
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
      ExecuteEscalationDto,
      { correlationId: finalCorrelationId }
    );

    return finalCorrelationId;
  }
}
