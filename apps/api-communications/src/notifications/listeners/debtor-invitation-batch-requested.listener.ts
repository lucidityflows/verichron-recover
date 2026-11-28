import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DispatchService } from '../../dispatch/dispatch.service';
import { DispatchMethod } from '@verichron/enums';
import { DebtorInvitationBatchRequestedDto } from '../../events/event-dto/debtors/debtor-invitation-batch-requested.dto'

/**
 * Listens for the DEBTORS_INVITATION_BATCH_REQUESTED event from api-debtors.
 */
@Injectable()
export class DebtorInvitationBatchRequestedListener extends AbstractBaseListener<DebtorInvitationBatchRequestedDto> {
  constructor(
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTORS,
    eventType: EVENT_TYPES.DEBTORS_INVITATION_BATCH_REQUESTED,
    dto: DebtorInvitationBatchRequestedDto,
  })
  async onMessage(data: DebtorInvitationBatchRequestedDto, envelope: EventEnvelope<DebtorInvitationBatchRequestedDto>): Promise<void> {
    this.logger.log(`📨 Received DEBTORS_INVITATION_BATCH_REQUESTED for batch ${data.invitationBatchId}`);

    // This could be further optimized by publishing dispatch requests to an internal queue,
    // but for now, sequential dispatch is acceptable.
    for (const invitation of data.invitations) {
      await this.dispatchService.dispatch({
        organizationId: data.organizationId,
        debtorId: invitation.debtorProfileId,
        communicationType: DispatchMethod.EMAIL,
        templateName: 'debtor-portal-invitation',
        context: { ...invitation, organizationId: data.organizationId },
        metadata: { invitationBatchId: data.invitationBatchId },
      });
    }

    this.logger.log(`✅ Dispatched ${data.invitations.length} portal invitations for batch ${data.invitationBatchId}`);
  }
}