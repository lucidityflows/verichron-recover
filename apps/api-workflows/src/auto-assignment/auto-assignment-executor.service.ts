import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@verichron/event-publisher';
import { AutoAssignmentService } from './auto-assignment.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { EVENT_TYPES } from '@verichron/events';
import { ExecuteAutoAssignmentDto } from '../events/event-dto';
import { AutoAssignmentConfig } from './entities/auto-assignment-config.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * Target entity to be assigned to a collector
 */
export interface AssignmentTarget {
  id: string;
  type: 'DEBT' | 'ACCOUNT' | 'DEBTOR';
  balance?: number;
  location?: {
    state?: string;
    city?: string;
    zipCode?: string;
  };
  category?: string;
  priority?: string;
  accountAge?: number; // days
  portfolioId?: string;
  [key: string]: any; // Allow other custom fields
}

/**
 * Result of an assignment attempt
 */
export interface AssignmentResult {
  success: boolean;
  configId: string;
  targetEntityId: string;
  commandPublished: boolean;
  correlationId?: string;
  error?: string;
}

/**
 * Parameters for direct execution
 */
export interface ExecuteAutoAssignmentParams {
  organizationId: string;
  configId: string;
  targetEntityId: string;
  targetEntityType: string;
  targetEntityData: any;
  correlationId?: string;
}

/**
 * AutoAssignmentExecutorService
 *
 * Responsible for executing auto-assignment logic:
 * 1. Validates config is enabled and not auto-disabled
 * 2. Checks rate limits per organization
 * 3. Handles delayed assignment scheduling
 * 4. Validates filters match target entity
 * 5. Publishes AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT command to api-automations
 *
 * This service does NOT execute the assignment strategies directly - it delegates
 * to api-automations which has access to EventOrchestratorClient for cross-service queries.
 */
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

  /**
   * Execute auto-assignment with parameters (used by event listeners)
   */
  async executeAutoAssignment(params: ExecuteAutoAssignmentParams): Promise<AssignmentResult> {
    const { organizationId, configId, targetEntityId, targetEntityType, targetEntityData, correlationId } = params;

    this.logger.log(
      `Executing auto-assignment: config=${configId}, target=${targetEntityId}, type=${targetEntityType}`
    );

    try {
      // Rate limit check
      if (!this.checkRateLimit(organizationId)) {
        this.logger.warn(`Rate limit exceeded for organization ${organizationId}`);
        return {
          success: false,
          configId,
          targetEntityId,
          commandPublished: false,
          error: 'Rate limit exceeded',
        };
      }

      // Fetch config
      const config = await this.autoAssignmentService.findOne(organizationId, configId);

      // Check if config is enabled and not auto-disabled
      if (!config.enabled || config.autoDisabled) {
        this.logger.debug(
          `Auto-assignment config ${configId} is disabled (enabled=${config.enabled}, autoDisabled=${config.autoDisabled})`
        );
        return {
          success: false,
          configId,
          targetEntityId,
          commandPublished: false,
          error: config.autoDisabled ? `Config auto-disabled: ${config.autoDisabledReason}` : 'Config is disabled',
        };
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
        return {
          success: true,
          configId,
          targetEntityId,
          commandPublished: false,
          correlationId,
        };
      }

      // Validate filters match target entity
      if (!this.validateFilters(config, targetEntityData)) {
        this.logger.debug(`Target entity ${targetEntityId} does not match config ${configId} filters`);
        return {
          success: false,
          configId,
          targetEntityId,
          commandPublished: false,
          error: 'Target entity does not match config filters',
        };
      }

      // Publish command to api-automations
      const finalCorrelationId = await this.publishAutoAssignmentCommand(
        config,
        targetEntityId,
        targetEntityType,
        targetEntityData,
        correlationId
      );

      this.logger.log(`Auto-assignment command published for config ${configId}`);

      return {
        success: true,
        configId,
        targetEntityId,
        commandPublished: true,
        correlationId: finalCorrelationId,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to execute auto-assignment for config ${configId}: ${errorMessage}`,
        errorStack
      );
      return {
        success: false,
        configId,
        targetEntityId,
        commandPublished: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute assignment with config object (legacy interface for backward compatibility)
   */
  async executeAssignment(
    config: AutoAssignmentConfig,
    targetEntity: AssignmentTarget,
  ): Promise<AssignmentResult> {
    return this.executeAutoAssignment({
      organizationId: config.organizationId,
      configId: config.id,
      targetEntityId: targetEntity.id,
      targetEntityType: targetEntity.type,
      targetEntityData: targetEntity,
    });
  }

  /**
   * Rate limiting: prevent more than MAX_ASSIGNMENTS_PER_ORG_PER_MINUTE assignments per org per minute
   */
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

  /**
   * Validate that target entity matches config filters
   */
  private validateFilters(config: AutoAssignmentConfig, targetEntityData: any): boolean {
    const { filters } = config;
    if (!filters) return true;

    // Portfolio filter
    if (filters.portfolioIds && filters.portfolioIds.length > 0) {
      const portfolioId = targetEntityData.portfolioId || targetEntityData.portfolio?.id;
      if (!portfolioId || !filters.portfolioIds.includes(portfolioId)) {
        this.logger.debug(`Portfolio filter mismatch: ${portfolioId} not in ${filters.portfolioIds.join(', ')}`);
        return false;
      }
    }

    // Balance range filter
    if (filters.balanceRange?.length === 2) {
      const balance = targetEntityData.balance || targetEntityData.totalBalance || 0;
      const [min, max] = filters.balanceRange;
      if (balance < min || balance > max) {
        this.logger.debug(`Balance filter mismatch: ${balance} not in range [${min}, ${max}]`);
        return false;
      }
    }

    // Account age filter
    if (filters.accountAgeRange?.length === 2) {
      const createdAt = targetEntityData.createdAt ? new Date(targetEntityData.createdAt) : null;
      if (createdAt) {
        const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const [minAge, maxAge] = filters.accountAgeRange;
        if (ageInDays < minAge || ageInDays > maxAge) {
          this.logger.debug(`Account age filter mismatch: ${ageInDays} days not in range [${minAge}, ${maxAge}]`);
          return false;
        }
      }
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      const priority = targetEntityData.priority;
      if (!priority || !filters.priority.includes(priority)) {
        this.logger.debug(`Priority filter mismatch: ${priority} not in ${filters.priority.join(', ')}`);
        return false;
      }
    }

    this.logger.debug(`All filters passed for target entity`);
    return true;
  }

  /**
   * Publish AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT command to api-automations
   */
  private async publishAutoAssignmentCommand(
    config: AutoAssignmentConfig,
    targetEntityId: string,
    targetEntityType: string,
    targetEntityData: any,
    correlationId?: string
  ): Promise<string> {
    const finalCorrelationId = correlationId || uuidv4();

    this.logger.debug(
      `Publishing auto-assignment command: strategy=${config.strategy}, correlationId=${finalCorrelationId}`
    );

    await this.eventPublisher.publish(
      EVENT_TYPES.AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT,
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
      ExecuteAutoAssignmentDto,
      { correlationId: finalCorrelationId }
    );

    return finalCorrelationId;
  }

  /**
   * Helper method to check if a target entity matches the config filters
   * This is used to validate if an entity is eligible for auto-assignment
   * (Public method for external validation)
   */
  matchesFilters(targetEntity: AssignmentTarget, config: AutoAssignmentConfig): boolean {
    return this.validateFilters(config, targetEntity);
  }
}
