import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { LogsService } from '../../logs/logs.service';
import { ActionType, CommunicationStatus, CommunicationType } from '@verichron/enums';
import { CollectorDebtorContactAttemptedDto } from '../../events/event-dto';

/**
 * Listens for events originating from the api-collectors service.
 */
@Injectable()
export class CollectorsListener extends AbstractBaseListener<CollectorDebtorContactAttemptedDto> {
  constructor(
    private readonly logsService: LogsService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    eventType: EVENT_TYPES.COLLECTORS_DEBTOR_CONTACT_ATTEMPTED,
    dto: CollectorDebtorContactAttemptedDto,
  })
  async onMessage(data: CollectorDebtorContactAttemptedDto, envelope: EventEnvelope<CollectorDebtorContactAttemptedDto>): Promise<void> {
    const communicationTypeMap: Partial<Record<string, CommunicationType>> = {
      [ActionType.CALL]: CommunicationType.CALL,
      [ActionType.EMAIL]: CommunicationType.EMAIL,
      [ActionType.SMS]: CommunicationType.SMS,
    };
    const communicationType = communicationTypeMap[data.actionType as string];
    
    if (!communicationType) {
      this.logger.warn(
        `Unsupported action type: ${data.actionType}. Acknowledging and skipping.`,
      );
      return; // Acknowledge and skip
    }

    await this.logsService.create({
      organizationId: data.organizationId,
      debtorId: data.debtorId,
      collectorUserId: data.collectorUserId,
      type: communicationType,
      status: CommunicationStatus.SENT,
      provider: 'manual',
      content: {
        body: data.notes || data.outcome || 'Contact attempt logged by collector.',
      },
      sentAt: new Date(data.contactDate),
      metadata: {
        source: 'collector-action-log',
        eventId: envelope.eventId,
        outcome: data.outcome,
        nextActionDue: data.nextActionDue,
      },
    });

    this.logger.log(
      `✅ Successfully created log for manual ${communicationType} contact by collector ${data.collectorUserId}`,
    );
  }
}