import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { CollectorResponseTrackingService } from '../collector-response-tracking.service';
import { WorkQueueItem } from '../../work-queue/entities/work-queue-item.entity';
import { ResponseType } from '@verichron/enums';
import { EmailReplyReceivedDto } from '../../events/event-dto';

/**
 * Event Listener: Email Reply Received
 *
 * Tracks debtor response when they reply to an email sent by a collector.
 * An email reply is considered a positive engagement signal.
 * Updates firstResponseAt in both CollectorResponseTracking and WorkQueueItem.
 */
@Injectable()
export class EmailReplyReceivedListener extends AbstractBaseListener<EmailReplyReceivedDto> {
  constructor(
    private readonly responseTrackingService: CollectorResponseTrackingService,
    @InjectRepository(WorkQueueItem)
    private readonly workQueueItemRepository: Repository<WorkQueueItem>,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COMMUNICATIONS,
    eventType: EVENT_TYPES.COMMUNICATIONS_EMAIL_REPLY_RECEIVED,
    dto: EmailReplyReceivedDto,
  })
  async onMessage(
    data: EmailReplyReceivedDto,
    envelope: EventEnvelope<EmailReplyReceivedDto>,
  ): Promise<void> {
    const { debtorId, organizationId, repliedAt } = data;

    this.logger.log(
      `Processing email reply received event for debtor ${debtorId} as response tracking`,
    );

    const replyReceivedDate = new Date(repliedAt);

    // Find the active work queue item for this debtor
    const workQueueItem = await this.workQueueItemRepository.findOne({
      where: {
        organizationId,
        debtorId,
        status: In(['NEW', 'IN_PROGRESS', 'FOLLOW_UP_SCHEDULED']),
      },
      order: { currentAssignmentStartedAt: 'DESC' },
    });

    if (!workQueueItem) {
      this.logger.debug(
        `No active work queue item found for debtor ${debtorId} - may not be in active collection`,
      );
      return;
    }

    // Only track as first response if we haven't recorded a response yet
    const tracking = await this.responseTrackingService['responseTrackingRepository'].findOne({
      where: {
        workQueueItemId: workQueueItem.id,
      },
      order: { assignedAt: 'DESC' },
    });

    if (tracking && !tracking.firstResponseAt) {
      // Record as first response in CollectorResponseTracking
      await this.responseTrackingService.recordFirstResponse(
        workQueueItem.id,
        replyReceivedDate,
        ResponseType.EMAIL_REPLY,
      );

      // Update denormalized field in WorkQueueItem
      await this.workQueueItemRepository.update(
        { id: workQueueItem.id },
        { firstResponseAt: replyReceivedDate },
      );

      this.logger.log(
        `Recorded email reply as first response for work queue item ${workQueueItem.id}`,
      );
    }
  }
}
