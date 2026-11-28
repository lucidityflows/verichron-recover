import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { CollectorResponseTrackingService } from '../collector-response-tracking.service';
import { ResolutionType } from '@verichron/enums';
import { WorkQueueItemCompletedDto } from '../../events/event-dto';

/**
 * Event Listener: Work Queue Item Completed
 *
 * Records resolution information in CollectorResponseTracking when a work queue item is completed.
 * Calculates days to resolution and determines if the resolution was successful.
 */
@Injectable()
export class WorkQueueItemCompletedListener extends AbstractBaseListener<WorkQueueItemCompletedDto> {
  constructor(
    private readonly responseTrackingService: CollectorResponseTrackingService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    eventType: EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_COMPLETED,
    dto: WorkQueueItemCompletedDto,
  })
  async onMessage(
    data: WorkQueueItemCompletedDto,
    envelope: EventEnvelope<WorkQueueItemCompletedDto>,
  ): Promise<void> {
    const {
      organizationId,
      workQueueItemId,
      debtorId,
      completedAt,
      resolutionType,
    } = data;

    this.logger.log(
      `Processing work queue item completed event for item ${workQueueItemId}`,
    );

    const completedDate = new Date(completedAt);

    // Record resolution in CollectorResponseTracking
    await this.responseTrackingService.recordResolution(
      workQueueItemId,
      completedDate,
      resolutionType,
    );

    this.logger.log(
      `Successfully recorded resolution for work queue item ${workQueueItemId}: ${resolutionType}`,
    );
  }
}
