import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { WorkQueueItem } from '../../work-queue/entities/work-queue-item.entity';
import { CollectorResponseTrackingService } from '../collector-response-tracking.service';
import { ResponseType } from '@verichron/enums';
import { VerificationRequestedDto } from '../../events/event-dto';

/**
 * Event Listener: Verification Requested
 *
 * Subscribes to VerificationRequested events from api-debtors and updates
 * CollectorResponseTracking to record debtor engagement (requesting verification).
 *
 * Business Logic:
 * - Treats verification request as a debtor response (VERIFICATION_REQUEST)
 * - Updates firstResponseAt if this is the first engagement
 * - Calculates timeToFirstResponseMinutes
 * - Updates WorkQueueItem cache fields for UI performance
 *
 * CQRS Pattern:
 * - This updates the Read Model (CollectorResponseTracking)
 * - Also updates denormalized cache in WorkQueueItem
 */
@Injectable()
export class VerificationRequestedListener extends AbstractBaseListener<VerificationRequestedDto> {
  constructor(
    @InjectRepository(WorkQueueItem)
    private readonly workQueueItemRepository: Repository<WorkQueueItem>,
    private readonly responseTrackingService: CollectorResponseTrackingService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTORS,
    eventType: EVENT_TYPES.DEBTORS_VERIFICATIONS_VERIFICATION_REQUESTED,
    dto: VerificationRequestedDto,
  })
  async onMessage(data: VerificationRequestedDto, envelope: EventEnvelope<VerificationRequestedDto>): Promise<void> {
    const { organizationId, debtorProfileId, requestedAt } = data;

    this.logger.log(
      `Handling verification requested event for debtor profile ${debtorProfileId}`,
    );

    // Find work queue item for this debtor
    const workQueueItem = await this.workQueueItemRepository.findOne({
      where: {
        organizationId,
        debtorId: debtorProfileId,
      },
      order: {
        createdAt: 'DESC', // Get most recent
      },
    });

    if (!workQueueItem) {
      this.logger.warn(
        `No work queue item found for debtor profile ${debtorProfileId}, skipping verification request tracking`,
      );
      return;
    }

    // Only track if item is assigned
    if (!workQueueItem.assignedToUserId) {
      this.logger.log(
        `Work queue item ${workQueueItem.id} is not assigned, skipping response tracking`,
      );
      return;
    }

    const respondedAt = new Date(requestedAt);

    // Update CollectorResponseTracking with verification request as response
    await this.responseTrackingService.recordFirstResponse(
      workQueueItem.id,
      respondedAt,
      ResponseType.VERIFICATION_REQUEST,
    );

    this.logger.log(
      `Updated response tracking for work queue item ${workQueueItem.id} with verification request`,
    );

    // Update WorkQueueItem cache if this is first response
    if (!workQueueItem.firstResponseAt) {
      workQueueItem.firstResponseAt = respondedAt;
      await this.workQueueItemRepository.save(workQueueItem);

      this.logger.log(
        `Updated work queue item ${workQueueItem.id} with first response timestamp`,
      );
    }
  }
}
