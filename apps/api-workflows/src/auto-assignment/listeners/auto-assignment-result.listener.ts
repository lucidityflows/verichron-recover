import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoAssignmentConfig } from '../../auto-assignment/entities/auto-assignment-config.entity';
import { AutoAssignmentService } from '../auto-assignment.service';
import { AutoAssignmentCompletedDto, AutoAssignmentFailedDto } from '../../events/event-dto';

/**
 * AutoAssignmentResultListener
 *
 * Listens for auto-assignment execution results from api-automations:
 * - AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED: Reset failure counter
 * - AUTOMATIONS_AUTO_ASSIGNMENT_FAILED: Increment failure counter, auto-disable if threshold reached
 *
 * This implements the auto-disable logic to prevent infinite failure loops.
 */
@Injectable()
export class AutoAssignmentResultListener extends AbstractBaseListener<AutoAssignmentCompletedDto | AutoAssignmentFailedDto> {
  // Note: This listener handles two different event types. 
  // We'll use a union type for the base class and handle validation within the methods if needed,
  // but for simple logic we can skip strict DTO class enforcement in the base if we override the flow.
  // Actually, standardizing on one DTO class per listener is better.
  // Since this class has TWO decorated methods, we need to be careful with __executeStandardizedFlow.
  // The AbstractBaseListener is designed for one listener method per class usually.
  
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  constructor(
    @InjectRepository(AutoAssignmentConfig)
    private readonly autoAssignmentConfigRepository: Repository<AutoAssignmentConfig>,
  ) {
    super();
  }

  /**
   * Handle auto-assignment results
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED,
    dto: AutoAssignmentCompletedDto,
  })
  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_FAILED,
    dto: AutoAssignmentFailedDto,
  })
  async onMessage(data: AutoAssignmentCompletedDto | AutoAssignmentFailedDto, envelope: EventEnvelope<AutoAssignmentCompletedDto | AutoAssignmentFailedDto>): Promise<void> {
    if (envelope.eventType === EVENT_TYPES.AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED) {
      await this.handleSuccess(data as AutoAssignmentCompletedDto);
    } else {
      await this.handleFailure(data as AutoAssignmentFailedDto);
    }
  }

  private async handleSuccess(data: AutoAssignmentCompletedDto): Promise<void> {
    const { configId, targetEntityId } = data;

    this.logger.log(`Auto-assignment completed successfully: config=${configId}, target=${targetEntityId}`);

    const config = await this.autoAssignmentConfigRepository.findOne({
      where: { id: configId },
    });

    if (!config) {
      this.logger.warn(`Auto-assignment config ${configId} not found`);
      return;
    }

    // Reset consecutive failures counter on success
    if (config.consecutiveFailures > 0) {
      this.logger.log(`Resetting consecutive failures for config ${configId} (was ${config.consecutiveFailures})`);
      config.consecutiveFailures = 0;

      // Re-enable if it was auto-disabled
      if (config.autoDisabled) {
        this.logger.log(`Re-enabling auto-disabled config ${configId}`);
        config.autoDisabled = false;
        config.autoDisabledAt = undefined;
        config.autoDisabledReason = undefined;
      }

      await this.autoAssignmentConfigRepository.save(config);
    }
  }

  private async handleFailure(data: AutoAssignmentFailedDto): Promise<void> {
    const { configId, targetEntityId, error } = data;

    this.logger.warn(`Auto-assignment failed: config=${configId}, target=${targetEntityId}, error=${error}`);

    const config = await this.autoAssignmentConfigRepository.findOne({
      where: { id: configId },
    });

    if (!config) {
      this.logger.warn(`Auto-assignment config ${configId} not found`);
      return;
    }

    // Increment consecutive failures
    config.consecutiveFailures = (config.consecutiveFailures || 0) + 1;

    this.logger.log(
      `Incremented consecutive failures for config ${configId}: ${config.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES}`
    );

    // Auto-disable if threshold reached
    if (config.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES && !config.autoDisabled) {
      this.logger.warn(
        `Auto-disabling config ${configId} after ${config.consecutiveFailures} consecutive failures`
      );

      config.autoDisabled = true;
      config.autoDisabledAt = new Date();
      config.autoDisabledReason = `Automatically disabled after ${config.consecutiveFailures} consecutive failures. Last error: ${error}`;

      // Also disable the config to prevent new triggers
      config.enabled = false;
    }

    await this.autoAssignmentConfigRepository.save(config);
  }
}
