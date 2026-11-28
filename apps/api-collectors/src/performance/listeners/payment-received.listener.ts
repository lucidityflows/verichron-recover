import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { CollectorResponseTrackingService } from '../collector-response-tracking.service';
import { DailyMetricsService } from '../daily-metrics.service';
import { WorkQueueItem } from '../../work-queue/entities/work-queue-item.entity';
import { ResponseType } from '@verichron/enums';
import { PaymentReceivedDto } from '../../events/event-dto';

/**
 * Event Listener: Payment Received
 *
 * Tracks debtor response when a payment is received.
 * A payment is considered a positive response to collection efforts.
 * Updates firstResponseAt in both CollectorResponseTracking and WorkQueueItem.
 * Also increments daily collection metrics for historical reporting.
 */
@Injectable()
export class PaymentReceivedListener extends AbstractBaseListener<PaymentReceivedDto> {
  constructor(
    private readonly responseTrackingService: CollectorResponseTrackingService,
    private readonly dailyMetricsService: DailyMetricsService,
    @InjectRepository(WorkQueueItem)
    private readonly workQueueItemRepository: Repository<WorkQueueItem>,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_PAYMENT_RECEIVED,
    dto: PaymentReceivedDto,
  })
  async onMessage(
    data: PaymentReceivedDto,
    envelope: EventEnvelope<PaymentReceivedDto>,
  ): Promise<void> {
    const { debtorId, organizationId, receivedAt, amount } = data;

    this.logger.log(
      `Processing payment received event for debtor ${debtorId} as response tracking`,
    );

    const paymentReceivedDate = new Date(receivedAt);

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
        `No active work queue item found for debtor ${debtorId} - payment may be from payment portal or plan`,
      );
      return;
    }

    // 1. Update Daily Metrics (Accumulator)
    if (workQueueItem.assignedToUserId) {
      // Amount is in dollars in DTO (number), convert to cents for accumulator
      const amountCents = Math.round(amount * 100);
      await this.dailyMetricsService.addCollection(
        organizationId,
        workQueueItem.assignedToUserId,
        amountCents,
        paymentReceivedDate,
      );
    }

    // 2. Only track as first response if we haven't recorded a response yet
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
        paymentReceivedDate,
        ResponseType.PAYMENT,
      );

      // Update denormalized field in WorkQueueItem
      await this.workQueueItemRepository.update(
        { id: workQueueItem.id },
        { firstResponseAt: paymentReceivedDate },
      );

      this.logger.log(
        `Recorded payment as first response for work queue item ${workQueueItem.id}`,
      );
    }
  }
}
