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
import { DebtorContactAttemptedDto } from '../../events/event-dto';

/**
 * ContactAttempted Event Listener
 *
 * Subscribes to CollectorDebtorContactAttempted events and updates work queue items.
 *
 * Workflow:
 * 1. Receive ContactAttempted event with contact details
 * 2. Find work queue item for the debtor
 * 3. Update last contact date and type
 * 4. Recalculate priority (recent contact reduces priority)
 * 5. Optionally update next action due date
 *
 * Event Source: api-communications (or api-organizations collector actions)
 * Event Type: collector.debtor.contact_attempted
 */
@Injectable()
export class ContactAttemptedListener extends AbstractBaseListener<DebtorContactAttemptedDto> {
  constructor(
    @InjectRepository(WorkQueueItem)
    private readonly workQueueRepository: Repository<WorkQueueItem>,
    private readonly prioritizationService: PrioritizationService,
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
      debtorId: debtorProfileId,
      organizationId,
      actionType,
      contactDate,
      nextActionDue,
      outcome,
    } = data;

    this.logger.log(`Processing ContactAttempted event for debtor profile ${debtorProfileId}`, {
      eventId: envelope.eventId,
      debtorProfileId,
      organizationId,
      actionType,
    });

    // Find work queue item for this debtor profile
    const workQueueItem = await this.workQueueRepository.findOne({
      where: {
        organizationId,
        debtorId: debtorProfileId,
      },
    });

    if (!workQueueItem) {
      this.logger.warn(
        `No work queue item found for debtor profile ${debtorProfileId} - skipping contact update`,
        { debtorProfileId, organizationId },
      );
      return;
    }

    // Update last contact information
    workQueueItem.lastContactDate = new Date(contactDate);
    workQueueItem.lastContactType = actionType;

    // Update next action due date if provided
    if (nextActionDue) {
      workQueueItem.nextActionDue = new Date(nextActionDue);
      workQueueItem.nextActionType = actionType; // Same type as last contact for follow-up
    }

    // Recalculate priority (recent contact reduces urgency)
    const { priorityScore, priorityLabel } =
      this.prioritizationService.calculatePriority({
        totalBalance: workQueueItem.totalBalance,
        daysOverdue: workQueueItem.daysOverdue,
        lastContactDate: workQueueItem.lastContactDate,
        hasPaymentPlan: workQueueItem.hasPaymentPlan,
        hasOpenDispute: workQueueItem.hasOpenDispute,
      });

    workQueueItem.priorityScore = priorityScore;
    workQueueItem.priorityLabel = priorityLabel;

    await this.workQueueRepository.save(workQueueItem);

    this.logger.log(`Work queue item updated after contact for debtor profile ${debtorProfileId}`, {
      debtorProfileId,
      itemId: workQueueItem.id,
      actionType,
      newPriority: priorityLabel,
    });
  }
}
