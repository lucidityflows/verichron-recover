/**
 * DebtorInvitationRequestedListener
 *
 * Subscribes to single debtor invitation events from api-debtors.
 * Creates provisional user accounts for debtors and publishes user creation events.
 *
 * Flow:
 * 1. Receives DEBTORS_INVITATION_REQUESTED from api-debtors
 * 2. Standardized validation and logging (via AbstractBaseListener)
 * 3. Creates provisional user if needed
 * 4. Publishes USERS_DEBTOR_USER_CREATED with userId mapping
 * 5. api-debtors subscribes to link userId to debtor identity
 */
import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  EVENT_SOURCES,
  type EventEnvelope,
} from '@verichron/events';
import { ProfilesService } from '../profiles.service';
import { EventPublisher } from '@verichron/event-publisher';
import { DebtorInvitationRequestedDto, DebtorUserCreatedDto } from '../../events/event-dto';

@Injectable()
export class DebtorInvitationRequestedListener extends AbstractBaseListener<DebtorInvitationRequestedDto> {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly eventPublisher: EventPublisher,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTORS,
    eventType: EVENT_TYPES.DEBTORS_INVITATION_REQUESTED,
    dto: DebtorInvitationRequestedDto,
  })
  async onMessage(data: DebtorInvitationRequestedDto, envelope: EventEnvelope<DebtorInvitationRequestedDto>) {
    // 1. Process invitation and create/link user
    const result = await this.profilesService.processSingleDebtorInvitation(
      data.debtorProfileId,
      data.organizationId,
      data.email,
      data.firstName,
      data.lastName,
    );

    // 2. Publish user created event using the new Gold Standard signature
    // (Source and Topic are defaulted automatically)
    await this.eventPublisher.publish(
      EVENT_TYPES.USERS_DEBTOR_USER_CREATED,
      {
        debtorProfileId: result.debtorProfileId,
        organizationId: result.organizationId,
        userId: result.userId,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        status: result.status,
        isNewUser: result.isNewUser,
        createdAt: new Date().toISOString(),
        invitationToken: result.invitationToken,
        invitationExpiresAt: result.invitationExpiresAt,
      },
      DebtorUserCreatedDto,
      { correlationId: envelope.correlationId }
    );
  }
}