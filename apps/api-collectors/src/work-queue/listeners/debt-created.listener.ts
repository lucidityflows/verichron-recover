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
import { PrioritizationService } from '../services/prioritization.service';
import { WorkQueueItemStatus } from '@verichron/enums';
import { DebtCreatedDto } from '../../events/event-dto';

/**
 * DebtCreated Event Listener
 *
 * Subscribes to DebtCreated events from api-debts and creates/updates work queue items.
 *
 * Workflow:
 * 1. Receive DebtCreated event with debt and debtor information
 * 2. Find or create work queue item for the debtor
 * 3. Calculate priority using PrioritizationService
 * 4. Update total balance and days overdue
 * 5. Set status to NEW if it's a new item
 *
 * Event Source: api-debts
 * Event Type: debts.debt.created
 */
@Injectable()
export class DebtCreatedListener extends AbstractBaseListener<DebtCreatedDto> {
  constructor(
    @InjectRepository(WorkQueueItem)
    private readonly workQueueRepository: Repository<WorkQueueItem>,
    private readonly prioritizationService: PrioritizationService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_CREATED,
    dto: DebtCreatedDto,
  })
  async onMessage(
    data: DebtCreatedDto,
    envelope: EventEnvelope<DebtCreatedDto>,
  ): Promise<void> {
    const { debtId, debtorProfileId, organizationId, amount, status } =
      data;

    this.logger.log(`Processing DebtCreated event for debt ${debtId}`, {
      eventId: envelope.eventId,
      debtId,
      debtorProfileId,
      organizationId,
    });

    // Find existing work queue item for this debtor
    let workQueueItem = await this.workQueueRepository.findOne({
      where: {
        organizationId,
        debtorId: debtorProfileId,
      },
    });

    if (workQueueItem) {
      // Update existing item
      workQueueItem.totalBalance += amount;
      // Note: daysOverdue and priority will be recalculated in a separate listener
      // that subscribes to debt aggregate events
    } else {
      // Create new work queue item
      const { priorityScore, priorityLabel } =
        this.prioritizationService.calculatePriority({
          totalBalance: amount,
          daysOverdue: 0, // New debt starts at 0 days overdue
          lastContactDate: null,
          hasPaymentPlan: false,
          hasOpenDispute: false,
        });

      workQueueItem = this.workQueueRepository.create({
        organizationId,
        debtorId: debtorProfileId,
        debtorName: 'Unknown', // Will be updated by debtor profile event
        totalBalance: amount,
        daysOverdue: 0,
        priorityScore,
        priorityLabel,
        status: WorkQueueItemStatus.NEW,
        hasOpenDispute: false,
        hasPaymentPlan: false,
        tags: [],
      });
    }

    await this.workQueueRepository.save(workQueueItem);

    this.logger.log(`Work queue item updated for debtor ${debtorProfileId}`, {
      debtId,
      debtorProfileId,
      itemId: workQueueItem.id,
      totalBalance: workQueueItem.totalBalance,
    });
  }
}
