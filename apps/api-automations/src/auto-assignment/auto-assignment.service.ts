import { Injectable, Logger } from '@nestjs/common';
import { AutoAssignmentExecutorService } from './auto-assignment-executor.service';
import { EventPublisher } from '@verichron/event-publisher';
import {
  EventOrchestratorClient,
  WorkQueueDataRequestedDto,
  WorkQueueDataResponseDto,
} from '@verichron/event-orchestrator';
import { EVENT_TOPICS, EVENT_TYPES, ExecuteAutoAssignmentPayload } from '@verichron/events';
import { AutoAssignmentCompletedDto, AutoAssignmentFailedDto } from '../events/event-dto';

@Injectable()
export class AutoAssignmentService {
  private readonly logger = new Logger(AutoAssignmentService.name);

  constructor(
    private readonly executor: AutoAssignmentExecutorService,
    private readonly eventPublisher: EventPublisher,
    private readonly orchestratorClient: EventOrchestratorClient,
  ) {}

  /**
   * Execute auto-assignment based on command from api-workflows
   */
  async executeAutoAssignment(payload: ExecuteAutoAssignmentPayload): Promise<void> {
    this.logger.log(
      `Executing auto-assignment for org ${payload.organizationId}, config ${payload.configId}`
    );

    try {
      // Execute the assignment strategy
      const result = await this.executor.executeAssignment(payload);

      // Publish completion event
      await this.eventPublisher.publish(
        EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED,
        {
          organizationId: payload.organizationId,
          configId: payload.configId,
          success: result.success,
          collectorId: result.collectorId,
          targetEntityId: result.targetEntityId,
          reason: result.reason,
          error: result.error,
        },
        AutoAssignmentCompletedDto,
        { correlationId: payload.correlationId },
      );

      if (!result.success) {
        this.logger.warn(`Auto-assignment failed: ${result.reason || result.error}`);
      } else {
        this.logger.log(
          `Auto-assignment completed: assigned ${result.targetEntityId} to collector ${result.collectorId}`
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Auto-assignment execution failed: ${errorMessage}`);

      // Publish failure event
      await this.eventPublisher.publish(
        EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_FAILED,
        {
          organizationId: payload.organizationId,
          configId: payload.configId,
          error: errorMessage,
        },
        AutoAssignmentFailedDto,
        { correlationId: payload.correlationId },
      );

      throw error;
    }
  }

  /**
   * Execute scheduled/batch auto-assignment for a configuration.
   * This method queries unassigned work queue items and assigns them based on the strategy.
   */
  async executeScheduledAutoAssignment(payload: any): Promise<void> {
    const { organizationId, configId, configName, filters } = payload;

    this.logger.log(
      `Executing scheduled auto-assignment for org ${organizationId}, config ${configId} (${configName})`
    );

    try {
      // Step 1: Query unassigned work queue items via orchestrator
      this.logger.debug(`Querying unassigned items for config ${configId}`);

      const response = await this.orchestratorClient.request<WorkQueueDataResponseDto, WorkQueueDataRequestedDto>(
        EVENT_TOPICS.AUTOMATIONS,
        EVENT_TYPES.AUTOMATIONS_WORK_QUEUE_DATA_REQUESTED,
        {
          organizationId,
          action: 'getUnassignedItems',
          filters,
          limit: 50, // Process up to 50 items per scheduled run
        },
        WorkQueueDataRequestedDto,
        10000 // 10 second timeout
      );

      const unassignedItems = response.payload?.unassignedItems || [];

      this.logger.log(
        `Found ${unassignedItems.length} unassigned items for config ${configId}`
      );

      if (unassignedItems.length === 0) {
        this.logger.debug('No unassigned items to process');
        return;
      }

      // Step 2: Execute assignment for each item
      let assignedCount = 0;
      let failedCount = 0;

      for (const item of unassignedItems) {
        try {
          const assignmentPayload: ExecuteAutoAssignmentPayload = {
            organizationId,
            configId,
            configName,
            strategy: payload.strategy,
            collectorPool: payload.collectorPool,
            excludeCollectors: payload.excludeCollectors,
            maxAssignmentsPerDay: payload.maxAssignmentsPerDay,
            workloadThreshold: payload.workloadThreshold,
            lastAssignedCollectorId: payload.lastAssignedCollectorId,
            dailyAssignmentCounts: payload.dailyAssignmentCounts,
            filters: payload.filters,
            targetEntityId: item.debtorId,
            targetEntityType: 'DEBTOR',
            targetEntityData: {
              balance: item.balance,
              location: item.location,
              category: item.category,
              priority: item.priorityLabel,
              accountAge: item.daysOverdue,
              portfolioId: item.portfolioId,
            },
            correlationId: `scheduled-${configId}-${item.debtorId}-${Date.now()}`,
          };

          const result = await this.executor.executeAssignment(assignmentPayload);

          if (result.success && result.collectorId) {
            assignedCount++;
            this.logger.debug(
              `Successfully assigned debtor ${item.debtorId} to collector ${result.collectorId}`
            );
          } else {
            failedCount++;
            this.logger.warn(
              `Failed to assign debtor ${item.debtorId}: ${result.reason || result.error}`
            );
          }
        } catch (error) {
          failedCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error assigning item ${item.debtorId}: ${errorMessage}`);
        }
      }

      this.logger.log(
        `Scheduled auto-assignment completed for config ${configId}: ` +
          `${assignedCount} assigned, ${failedCount} failed out of ${unassignedItems.length} items`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Scheduled auto-assignment execution failed for config ${configId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
