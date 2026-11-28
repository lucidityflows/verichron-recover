import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { CollectorResponseTrackingService } from '../collector-response-tracking.service';
import { DailyMetricsService } from '../daily-metrics.service';
import { WorkQueueItem } from '../../work-queue/entities/work-queue-item.entity';
import { DebtorContactAttemptedDto } from '../../events/event-dto';
import { ActionType } from '@verichron/enums';

/**
 * Event Listener: Debtor Contact Attempted
 *
 * Updates CollectorResponseTracking when a collector makes a contact attempt.
 * Tracks first contact attempt timestamp and increments contact attempt count.
 * Also updates denormalized field in WorkQueueItem for UI display.
 * Increments daily metrics for historical reporting.
 */
@Injectable()
export class DebtorContactAttemptedListener extends AbstractBaseListener<DebtorContactAttemptedDto> {
  constructor(
    private readonly responseTrackingService: CollectorResponseTrackingService,
    private readonly dailyMetricsService: DailyMetricsService,
    @InjectRepository(WorkQueueItem)
    private readonly workQueueItemRepository: Repository<WorkQueueItem>,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    eventType: EVENT_TYPES.COLLECTORS_DEBTOR_CONTACT_ATTEMPTED,
    dto: DebtorContactAttemptedDto,
  })
  async onMessage(
    data: DebtorContactAttemptedDto,
    envelope: EventEnvelope<DebtorContactAttemptedDto>,
  ): Promise<void> {
    const {
      debtorId,
      organizationId,
      collectorUserId,
      attemptedAt,
      actionType,
    } = data;

    this.logger.log(
      `Processing contact attempted event for debtor ${debtorId} by collector ${collectorUserId}`,
    );

    const contactedDate = new Date(attemptedAt);

    // 1. Update Daily Metrics (Accumulator)
    if (actionType === ActionType.CALL) {
      await this.dailyMetricsService.incrementMetric(organizationId, collectorUserId, 'callsMade', 1, contactedDate);
    } else if (actionType === ActionType.EMAIL) {
      await this.dailyMetricsService.incrementMetric(organizationId, collectorUserId, 'emailsSent', 1, contactedDate);
    } else if (actionType === ActionType.SMS) {
      await this.dailyMetricsService.incrementMetric(organizationId, collectorUserId, 'smsSent', 1, contactedDate);
    }
    
    // Always increment unique contacts (the upsert handles the unique constraint logic if needed, 
    // but here we just increment the counter for the day)
    await this.dailyMetricsService.incrementMetric(organizationId, collectorUserId, 'uniqueAccountsContacted', 1, contactedDate);

    // 2. Find the active work queue item for this debtor/collector
    const workQueueItem = await this.workQueueItemRepository.findOne({
      where: {
        organizationId,
        debtorId,
        assignedToUserId: collectorUserId,
        status: In(['NEW', 'IN_PROGRESS', 'FOLLOW_UP_SCHEDULED']),
      },
      order: { currentAssignmentStartedAt: 'DESC' },
    });

    if (!workQueueItem) {
      this.logger.warn(
        `No active work queue item found for debtor ${debtorId} assigned to collector ${collectorUserId}`,
      );
      return;
    }

    // 3. Update CollectorResponseTracking (increments contact attempts)
    await this.responseTrackingService.recordFirstContactAttempt(
      workQueueItem.id,
      contactedDate,
    );

    // 4. Update denormalized field in WorkQueueItem if this is the first contact
    if (!workQueueItem.firstContactAttemptAt) {
      await this.workQueueItemRepository.update(
        { id: workQueueItem.id },
        { firstContactAttemptAt: contactedDate },
      );

      this.logger.log(
        `Updated first contact attempt timestamp for work queue item ${workQueueItem.id}`,
      );
    }

    this.logger.log(
      `Successfully recorded contact attempt for debtor ${debtorId}`,
    );
  }
}


