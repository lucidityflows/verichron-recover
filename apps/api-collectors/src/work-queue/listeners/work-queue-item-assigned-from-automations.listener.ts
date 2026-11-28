import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { EventEnvelope } from '@verichron/events';
import { WorkQueueItem } from '../entities/work-queue-item.entity';
import { AssignmentReason, WorkQueueItemStatus, NotificationType } from '@verichron/enums';
import { CollectorResponseTrackingService } from '../../performance/collector-response-tracking.service';
import { NotificationService } from '../../notifications/notifications.service';
import { AssignmentRegistryService } from '../../assignments/assignment-registry.service';
import { WorkQueueItemAssignedDto } from '../../events/event-dto';

/**
 * Event Listener: Work Queue Item Assigned (from api-automations)
 *
 * Handles assignment events published by api-automations after auto-assignment execution.
 * Updates the work queue item and republishes a standardized event for response tracking.
 */
@Injectable()
export class WorkQueueItemAssignedFromAutomationsListener extends AbstractBaseListener<WorkQueueItemAssignedDto> {
  constructor(
    @InjectRepository(WorkQueueItem)
    private readonly workQueueItemRepository: Repository<WorkQueueItem>,
    private readonly responseTrackingService: CollectorResponseTrackingService,
    private readonly notificationService: NotificationService,
    private readonly registryService: AssignmentRegistryService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    eventType: EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED,
    dto: WorkQueueItemAssignedDto,
  })
  async onMessage(
    data: WorkQueueItemAssignedDto,
    envelope: EventEnvelope<WorkQueueItemAssignedDto>,
  ): Promise<void> {
    const {
      organizationId,
      collectorId,
      targetEntityId,
      assignmentReason,
    } = data;

    this.logger.log(
      `Processing work queue assignment from automations: debtor ${targetEntityId} → collector ${collectorId}`,
    );

    // Find the work queue item for this debtor
    const workQueueItem = await this.workQueueItemRepository.findOne({
      where: {
        organizationId,
        debtorId: targetEntityId,
      },
      order: { createdAt: 'DESC' },
    });

    if (!workQueueItem) {
      this.logger.error(
        `No work queue item found for debtor ${targetEntityId} in org ${organizationId}`,
      );
      return;
    }

    const now = new Date();
    const previousCollectorId = workQueueItem.assignedToUserId;

    // Update work queue item with assignment
    workQueueItem.assignedToUserId = collectorId;
    workQueueItem.currentAssignmentStartedAt = now;
    workQueueItem.status = WorkQueueItemStatus.IN_PROGRESS;

    await this.workQueueItemRepository.save(workQueueItem);

    this.logger.log(
      `Updated work queue item ${workQueueItem.id} with collector ${collectorId}`,
    );

    // Synchronize with Redis Tactical Registry
    if (previousCollectorId) {
      await this.registryService.removeAssignment(previousCollectorId, targetEntityId);
    }
    await this.registryService.addAssignment(collectorId, targetEntityId);

    // Map assignment reason string to enum
    let assignmentReasonEnum: AssignmentReason = AssignmentReason.MANUAL;
    if (assignmentReason) {
      if (assignmentReason.includes('round')) {
        assignmentReasonEnum = AssignmentReason.AUTO_ROUND_ROBIN;
      } else if (assignmentReason.includes('workload') || assignmentReason.includes('least')) {
        assignmentReasonEnum = AssignmentReason.AUTO_LEAST_WORKLOAD;
      } else if (assignmentReason.includes('skill')) {
        assignmentReasonEnum = AssignmentReason.AUTO_SKILL_BASED;
      } else if (assignmentReason.includes('geographic') || assignmentReason.includes('territory')) {
        assignmentReasonEnum = AssignmentReason.AUTO_GEOGRAPHIC;
      } else if (assignmentReason.includes('auto')) {
        assignmentReasonEnum = AssignmentReason.AUTO_ROUND_ROBIN; // Default auto strategy
      }
    }

    // Create response tracking record directly (CQRS Read Model)
    await this.responseTrackingService.createTrackingRecord({
      organizationId,
      collectorUserId: collectorId,
      debtorId: targetEntityId,
      workQueueItemId: workQueueItem.id,
      assignedAt: now,
      assignmentReason: assignmentReasonEnum,
      reassignedFromCollectorId: previousCollectorId ?? undefined,
    });

    this.logger.log(
      `Created response tracking record for work queue item ${workQueueItem.id}`,
    );

    // Create notification for collector
    try {
      const balanceFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(workQueueItem.totalBalance));

      await this.notificationService.createNotification({
        organizationId,
        userId: collectorId,
        type: NotificationType.WORK_ITEM_ASSIGNED,
        title: 'New Work Item Assigned',
        message: `You have been assigned: ${workQueueItem.debtorName} (${balanceFormatted})`,
        actionLink: `/work-queue/${workQueueItem.id}`,
        metadata: {
          workQueueItemId: workQueueItem.id,
          debtorId: targetEntityId,
          debtorName: workQueueItem.debtorName,
          balance: Number(workQueueItem.totalBalance),
          assignmentReason: assignmentReasonEnum,
        },
      });

      this.logger.log(`Created notification for collector ${collectorId}`);
    } catch (notificationError) {
      // Log but don't fail the assignment if notification fails
      this.logger.error(
        `Failed to create notification: ${notificationError instanceof Error ? notificationError.message : 'Unknown error'}`,
      );
    }
  }
}
