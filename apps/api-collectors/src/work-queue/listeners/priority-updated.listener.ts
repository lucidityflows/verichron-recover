import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { UpdatePriorityDto } from '../../events/event-dto';
import { WorkQueueItem } from '../entities/work-queue-item.entity';
import { WorkQueuePriority } from '@verichron/enums';
import { PrioritizationService } from '../services/prioritization.service';

/**
 * PriorityUpdated Event Listener
 *
 * Subscribes to UPDATE_PRIORITY commands from api-workflows
 * and updates work queue item priorities.
 */
@Injectable()
export class PriorityUpdatedListener extends AbstractBaseListener<UpdatePriorityDto> {
  constructor(
    @InjectRepository(WorkQueueItem)
    private readonly workQueueRepository: Repository<WorkQueueItem>,
    private readonly prioritizationService: PrioritizationService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_WORKFLOW_COMMAND_UPDATE_PRIORITY,
    dto: UpdatePriorityDto,
  })
  async onMessage(
    data: UpdatePriorityDto,
    envelope: EventEnvelope<UpdatePriorityDto>,
  ): Promise<void> {
    const {
      organizationId,
      targetEntityId,
      newPriority,
    } = data;

    this.logger.log(`Processing UpdatePriority command for ${targetEntityId}`, {
      eventId: envelope.eventId,
      organizationId,
      newPriority,
    });

    // Find work queue item
    const workQueueItem = await this.workQueueRepository.findOne({
      where: {
        organizationId,
        debtorId: targetEntityId,
      },
    });

    if (!workQueueItem) {
      this.logger.warn(
        `No work queue item found for ${targetEntityId}`,
      );
      return;
    }

    // Map string priority to enum
    const priorityMap: Record<string, WorkQueuePriority> = {
      'LOW': WorkQueuePriority.LOW,
      'MEDIUM': WorkQueuePriority.MEDIUM,
      'HIGH': WorkQueuePriority.HIGH,
      'URGENT': WorkQueuePriority.URGENT,
    };

    workQueueItem.priorityLabel = priorityMap[newPriority];
    
    // Recalculate numeric score based on new label
    const { priorityScore } = this.prioritizationService.calculatePriority({
      totalBalance: workQueueItem.totalBalance,
      daysOverdue: workQueueItem.daysOverdue,
      lastContactDate: workQueueItem.lastContactDate,
      hasPaymentPlan: workQueueItem.hasPaymentPlan,
      hasOpenDispute: workQueueItem.hasOpenDispute,
    });
    
    workQueueItem.priorityScore = priorityScore;

    await this.workQueueRepository.save(workQueueItem);

    this.logger.log(`Priority updated for ${targetEntityId} to ${newPriority}`);
  }
}