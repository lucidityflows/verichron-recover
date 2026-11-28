/**
 * DebtorInvitationBatchListener
 *
 * Subscribes to debtor invitation batch events from api-debtors.
 * Creates provisional user accounts for debtors and publishes user creation events.
 *
 * Flow:
 * 1. Receives DEBTORS_INVITATION_BATCH_REQUESTED from api-debtors
 * 2. Standardized validation and logging (via AbstractBaseListener)
 * 3. Creates provisional users if needed
 * 4. Publishes USERS_DEBTOR_USER_CREATED_BATCH with userId mappings
 * 5. api-debtors subscribes to link userIds to debtor identities
 */
import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { ProfilesService } from '../profiles.service';
import { EventPublisher } from '@verichron/event-publisher';
import { DebtorInvitationBatchRequestedDto, DebtorUserCreatedBatchDto } from '../../events/event-dto';

@Injectable()
export class DebtorInvitationBatchRequestedListener extends AbstractBaseListener<DebtorInvitationBatchRequestedDto> {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly eventPublisher: EventPublisher,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTORS,
    eventType: EVENT_TYPES.DEBTORS_INVITATION_BATCH_REQUESTED,
    dto: DebtorInvitationBatchRequestedDto,
  })
  async onMessage(data: DebtorInvitationBatchRequestedDto, envelope: EventEnvelope<DebtorInvitationBatchRequestedDto>) {
    // 1. Process invitations and create/link users
    const userMappings = await this.profilesService.processDebtorInvitationBatch(
      data.organizationId,
      data.invitations,
    );

    // 2. Publish user created batch event using the new Gold Standard signature
    await this.eventPublisher.publish(
      EVENT_TYPES.USERS_DEBTOR_USER_CREATED_BATCH,
      {
        invitationBatchId: data.invitationBatchId,
        organizationId: data.organizationId,
        batchNumber: data.batchNumber,
        userMappings,
        createdAt: new Date().toISOString(),
      },
      DebtorUserCreatedBatchDto,
      { correlationId: envelope.correlationId }
    );
  }
}