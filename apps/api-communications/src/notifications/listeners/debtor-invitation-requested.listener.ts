import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DispatchService } from '../../dispatch/dispatch.service';
import { DispatchMethod } from '@verichron/enums';
import { DebtorInvitationRequestedDto } from '../../events/event-dto/debtors/debtor-invitation-requested.dto'

/**
 * Listens for the DEBTORS_INVITATION_REQUESTED event from api-debtors.
 */
@Injectable()
export class DebtorInvitationRequestedListener extends AbstractBaseListener<DebtorInvitationRequestedDto> {
  constructor(
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTORS,
    eventType: EVENT_TYPES.DEBTORS_INVITATION_REQUESTED,
    dto: DebtorInvitationRequestedDto,
  })
  async onMessage(data: DebtorInvitationRequestedDto, envelope: EventEnvelope<DebtorInvitationRequestedDto>): Promise<void> {
    this.logger.log(`📨 Received DEBTORS_INVITATION_REQUESTED for debtor ${data.debtorProfileId}`);

    await this.dispatchService.dispatch({
      organizationId: data.organizationId,
      debtorId: data.debtorProfileId,
      communicationType: DispatchMethod.EMAIL,
      templateName: 'debtor-portal-invitation',
      context: { ...data },
    });

    this.logger.log(`✅ Dispatched portal invitation for debtor ${data.debtorProfileId}`);
  }
}