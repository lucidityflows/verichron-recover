import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EventPublisher } from '@verichron/event-publisher';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  EVENT_SOURCES,
  type EventEnvelope,
} from '@verichron/events';
import { WorkQueueItem } from '../entities/work-queue-item.entity';
import { PrioritizationService } from '../services/prioritization.service';
import { ResolutionType, WorkQueueItemStatus } from '@verichron/enums';
import { PaymentReceivedDto, WorkQueueItemCompletedDto } from '../../events/event-dto';

/**
 * PaymentReceived Event Listener
 *
 * Subscribes to PaymentReceived events from api-transactions and updates work queue items.
 *
 * Workflow:
 * 1. Receive PaymentReceived event with payment details
 * 2. Find work queue item for the debtor
 * 3. Reduce total balance by payment amount
 * 4. Recalculate priority based on new balance
 * 5. Mark as recently contacted (payment is a form of engagement)
 *
 * Event Source: api-transactions
 * Event Type: transactions.payment.received
 */
@Injectable()
export class PaymentReceivedListener extends AbstractBaseListener<PaymentReceivedDto> {
  constructor(
    @InjectRepository(WorkQueueItem)
    private readonly workQueueRepository: Repository<WorkQueueItem>,
    private readonly prioritizationService: PrioritizationService,
    private readonly eventPublisher: EventPublisher,
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
    const { paymentId, debtorId: debtorProfileId, amount } = data;

    this.logger.log(`Processing PaymentReceived event for payment ${paymentId}`, {
      eventId: envelope.eventId,
      paymentId,
      debtorProfileId,
      amount,
    });

    // Find work queue item for this debtor profile
    const workQueueItem = await this.workQueueRepository.findOne({
      where: {
        debtorId: debtorProfileId,
      },
    });

    if (!workQueueItem) {
      this.logger.warn(
        `No work queue item found for debtor profile ${debtorProfileId} - skipping payment update`,
        { paymentId, debtorProfileId },
      );
      return;
    }

    // Update balance
    const newBalance = Math.max(0, workQueueItem.totalBalance - amount);
    workQueueItem.totalBalance = newBalance;

    // Update last contact (payment indicates engagement)
    workQueueItem.lastContactDate = new Date();
    workQueueItem.lastContactType = null; // Payment is not a contact type

    // Recalculate priority
    const { priorityScore, priorityLabel } =
      this.prioritizationService.calculatePriority({
        totalBalance: newBalance,
        daysOverdue: workQueueItem.daysOverdue,
        lastContactDate: workQueueItem.lastContactDate,
        hasPaymentPlan: workQueueItem.hasPaymentPlan,
        hasOpenDispute: workQueueItem.hasOpenDispute,
      });

    workQueueItem.priorityScore = priorityScore;
    workQueueItem.priorityLabel = priorityLabel;

    // If balance is now zero, mark as completed
    const wasCompleted = newBalance === 0 && workQueueItem.status !== WorkQueueItemStatus.COMPLETED;
    if (wasCompleted) {
      workQueueItem.status = WorkQueueItemStatus.COMPLETED;
    }

    await this.workQueueRepository.save(workQueueItem);

    this.logger.log(`Work queue item updated after payment for debtor profile ${debtorProfileId}`, {
      paymentId,
      debtorProfileId,
      itemId: workQueueItem.id,
      newBalance,
      newPriority: priorityLabel,
      completed: wasCompleted,
    });

    // Publish completion event for response tracking
    if (wasCompleted) {
      await this.eventPublisher.publish(
        EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_COMPLETED,
        {
          organizationId: workQueueItem.organizationId,
          workQueueItemId: workQueueItem.id,
          debtorId: debtorProfileId!,
          collectorUserId: workQueueItem.assignedToUserId!,
          completedAt: new Date().toISOString(),
          resolutionType: ResolutionType.PAID_IN_FULL,
          outcome: 'Debt paid in full',
        },
        WorkQueueItemCompletedDto,
      );

      this.logger.log(
        `Published work queue item completed event for item ${workQueueItem.id}`,
      );
    }
  }
}
