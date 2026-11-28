import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { WorkQueueItem } from '../entities/work-queue-item.entity';
import { WorkQueueItemStatus } from '@verichron/enums';
import { CreateTaskDto } from '../../events/event-dto';

/**
 * TaskCreated Event Listener
 *
 * Subscribes to CREATE_TASK commands from api-workflows
 * and creates tasks in the work queue.
 */
@Injectable()
export class TaskCreatedListener extends AbstractBaseListener<CreateTaskDto> {
  constructor(
    @InjectRepository(WorkQueueItem)
    private readonly workQueueRepository: Repository<WorkQueueItem>,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    eventType: EVENT_TYPES.COLLECTORS_WORKFLOW_COMMAND_CREATE_TASK,
    dto: CreateTaskDto,
  })
  async onMessage(
    data: CreateTaskDto,
    envelope: EventEnvelope<CreateTaskDto>,
  ): Promise<void> {
    const {
      organizationId,
      assigneeId,
      taskType,
      targetEntityId,
      dueDate,
      priority,
    } = data;

    this.logger.log(`Processing CreateTask command for ${targetEntityId}`, {
      eventId: envelope.eventId,
      organizationId,
      assigneeId,
      taskType,
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

    // Update work queue item with task details
    workQueueItem.nextActionType = taskType;
    workQueueItem.nextActionDue = new Date(dueDate);
    workQueueItem.assignedToUserId = assigneeId;
    workQueueItem.status = WorkQueueItemStatus.IN_PROGRESS;

    await this.workQueueRepository.save(workQueueItem);

    this.logger.log(`Task created in work queue for ${targetEntityId}`);
  }
}