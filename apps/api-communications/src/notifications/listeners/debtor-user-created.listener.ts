import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { DispatchService } from '../../dispatch/dispatch.service';
import { DispatchMethod } from '@verichron/enums';
import { DebtorUserCreatedDto } from '../../events/event-dto';

/**
 * Listens for the USERS_DEBTOR_USER_CREATED event from api-users.
 */
@Injectable()
export class DebtorUserCreatedListener extends AbstractBaseListener<DebtorUserCreatedDto> {
  constructor(
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.USERS,
    eventType: EVENT_TYPES.USERS_DEBTOR_USER_CREATED,
    dto: DebtorUserCreatedDto,
  })
  async onMessage(data: DebtorUserCreatedDto, envelope: EventEnvelope<DebtorUserCreatedDto>): Promise<void> {
    this.logger.log(`📨 Received USERS_DEBTOR_USER_CREATED for user ${data.userId}`);

    await this.dispatchService.dispatch({
      organizationId: data.organizationId,
      debtorId: data.userId, // The user is the debtor in this context
      communicationType: DispatchMethod.EMAIL,
      templateName: 'welcome-email',
      context: { ...data },
    });

    this.logger.log(`✅ Dispatched welcome email for user ${data.userId}`);
  }
}