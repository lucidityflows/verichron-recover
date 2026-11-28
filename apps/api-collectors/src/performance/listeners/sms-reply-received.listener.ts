import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { CollectorResponseTrackingService } from '../collector-response-tracking.service';
import { WorkQueueItem } from '../../work-queue/entities/work-queue-item.entity';
import { ResponseType } from '@verichron/enums';
import { SmsReplyReceivedDto } from '../../events/event-dto';

/**
 * Event Listener: SMS Reply Received
 *
 * Tracks debtor response when they reply to an SMS sent by a collector.
 * An SMS reply is considered a positive engagement signal.
 * Updates firstResponseAt in both CollectorResponseTracking and WorkQueueItem.
 */
@Injectable()
export class SmsReplyReceivedListener extends AbstractBaseListener<SmsReplyReceivedDto> {
  constructor(
    private readonly responseTrackingService: CollectorResponseTrackingService,
    @InjectRepository(WorkQueueItem)
    private readonly workQueueItemRepository: Repository<WorkQueueItem>,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COMMUNICATIONS,
    eventType: EVENT_TYPES.COMMUNICATIONS_SMS_REPLY_RECEIVED,
    dto: SmsReplyReceivedDto,
  })
  async onMessage(
    data: SmsReplyReceivedDto,
    envelope: EventEnvelope<SmsReplyReceivedDto>,
  ): Promise<void> {
    const { debtorId, organizationId, repliedAt } = data;

    this.logger.log(
      `Processing SMS reply received event for debtor ${debtorId} as response tracking`,
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
        ResponseType.SMS_REPLY,
      );

      // Update denormalized field in WorkQueueItem
      await this.workQueueItemRepository.update(
        { id: workQueueItem.id },
        { firstResponseAt: replyReceivedDate },
      );

      this.logger.log(
        `Recorded SMS reply as first response for work queue item ${workQueueItem.id}`,
      );
    }
  }
}
