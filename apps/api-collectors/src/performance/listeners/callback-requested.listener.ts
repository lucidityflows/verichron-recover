import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { CollectorResponseTrackingService } from '../collector-response-tracking.service';
import { WorkQueueItem } from '../../work-queue/entities/work-queue-item.entity';
import { ResponseType, CallbackRequestSource, WorkQueuePriority } from '@verichron/enums';
import { CallbackRequestedDto } from '../../events/event-dto';

/**
 * Event Listener: Callback Requested
 *
 * Tracks debtor response when they request a callback through any channel
 * (email reply, SMS reply, IVR, portal, voicemail).
 * A callback request is considered a strong engagement signal indicating
 * the debtor wants to communicate.
 * Updates firstResponseAt in both CollectorResponseTracking and WorkQueueItem.
 */
@Injectable()
export class CallbackRequestedListener extends AbstractBaseListener<CallbackRequestedDto> {
  constructor(
    private readonly responseTrackingService: CollectorResponseTrackingService,
    @InjectRepository(WorkQueueItem)
    private readonly workQueueItemRepository: Repository<WorkQueueItem>,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COMMUNICATIONS,
    eventType: EVENT_TYPES.COMMUNICATIONS_CALLBACK_REQUESTED,
    dto: CallbackRequestedDto,
  })
  async onMessage(
    data: CallbackRequestedDto,
    envelope: EventEnvelope<CallbackRequestedDto>,
  ): Promise<void> {
    const { debtorId, organizationId, requestedAt, requestSource } = data;

    this.logger.log(
      `Processing callback request event for debtor ${debtorId} from ${requestSource} as response tracking`,
    );

    const callbackRequestedDate = new Date(requestedAt);

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
        callbackRequestedDate,
        ResponseType.CALLBACK_REQUEST,
      );

      // Update denormalized field in WorkQueueItem
      await this.workQueueItemRepository.update(
        { id: workQueueItem.id },
        { firstResponseAt: callbackRequestedDate },
      );

      this.logger.log(
        `Recorded callback request as first response for work queue item ${workQueueItem.id}`,
      );
    }
  }
}
