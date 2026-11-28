import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { WorkQueueItem } from '../../work-queue/entities/work-queue-item.entity';
import { CollectorResponseTrackingService } from '../collector-response-tracking.service';
import { ResponseType } from '@verichron/enums';
import { PaymentPlanCreatedDto } from '../../events/event-dto';

/**
 * Event Listener: Payment Plan Created
 *
 * Subscribes to PaymentPlanCreated events from api-transactions and updates
 * CollectorResponseTracking to record debtor engagement (setting up payment plan).
 *
 * Business Logic:
 * - Treats payment plan setup as a debtor response (PAYMENT_PLAN_SETUP)
 * - Updates firstResponseAt if this is the first engagement
 * - Calculates timeToFirstResponseMinutes
 * - Updates WorkQueueItem cache fields for UI performance
 *
 * CQRS Pattern:
 * - This updates the Read Model (CollectorResponseTracking)
 * - Also updates denormalized cache in WorkQueueItem
 */
@Injectable()
export class PaymentPlanCreatedListener extends AbstractBaseListener<PaymentPlanCreatedDto> {
  constructor(
    @InjectRepository(WorkQueueItem)
    private readonly workQueueItemRepository: Repository<WorkQueueItem>,
    private readonly responseTrackingService: CollectorResponseTrackingService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_PAYMENT_PLAN_CREATED,
    dto: PaymentPlanCreatedDto,
  })
  async onMessage(data: PaymentPlanCreatedDto, envelope: EventEnvelope<PaymentPlanCreatedDto>): Promise<void> {
    const { organizationId, debtorProfileId, createdAt } = data;

    this.logger.log(
      `Handling payment plan created event for debtor profile ${debtorProfileId}`,
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
        `No work queue item found for debtor profile ${debtorProfileId}, skipping payment plan response tracking`,
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

    const respondedAt = new Date(createdAt);

    // Update CollectorResponseTracking with payment plan setup as response
    await this.responseTrackingService.recordFirstResponse(
      workQueueItem.id,
      respondedAt,
      ResponseType.PAYMENT_PLAN_SETUP,
    );

    this.logger.log(
      `Updated response tracking for work queue item ${workQueueItem.id} with payment plan setup`,
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
