import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DispatchService } from '../../dispatch/dispatch.service';
import { DispatchMethod } from '@verichron/enums';
import { DebtorVerificationStatusChangedDto } from '../../events/event-dto';

/**
 * Listens for the DEBTORS_PROFILE_VERIFICATION_STATUS_CHANGED event from api-debtors.
 */
@Injectable()
export class ProfileVerificationStatusChangedListener extends AbstractBaseListener<DebtorVerificationStatusChangedDto> {
  constructor(
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTORS,
    eventType: EVENT_TYPES.DEBTORS_PROFILE_VERIFICATION_STATUS_CHANGED,
    dto: DebtorVerificationStatusChangedDto,
  })
  async onMessage(data: DebtorVerificationStatusChangedDto, envelope: EventEnvelope<DebtorVerificationStatusChangedDto>): Promise<void> {
    this.logger.log(`📨 Received DEBTORS_PROFILE_VERIFICATION_STATUS_CHANGED for debtor ${data.debtorId} to status ${data.verificationStatus}`);

    const templateMap = {
      'VERIFIED': 'verification-successful',
      'REJECTED': 'verification-failed',
    };
    const templateName = templateMap[data.verificationStatus as unknown as keyof typeof templateMap];

    if (!templateName) {
      this.logger.log(`No communication for verification status '${data.verificationStatus}'. Skipping.`);
      return;
    }

    await this.dispatchService.dispatch({
      organizationId: data.organizationId,
      debtorId: data.debtorId,
      communicationType: DispatchMethod.EMAIL,
      templateName,
      context: { ...data },
    });
    
    this.logger.log(`✅ Dispatched verification status notification for debtor ${data.debtorId}`);
  }
}