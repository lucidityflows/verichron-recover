import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { EventEnvelope } from '@verichron/events';
import { ExecuteEscalationDto } from '../event-dto';
import { EscalationService } from '../../escalation/escalation.service';

@Injectable()
export class ExecuteEscalationListener extends AbstractBaseListener<ExecuteEscalationDto> {
  constructor(private readonly escalationService: EscalationService) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_EXECUTE_ESCALATION,
    dto: ExecuteEscalationDto,
  })
  async onMessage(data: ExecuteEscalationDto, envelope: EventEnvelope<ExecuteEscalationDto>) {
    this.logger.debug(
      `Received EXECUTE_ESCALATION: rule=${data.ruleId}, org=${data.organizationId}`
    );

    await this.escalationService.executeEscalation(data);
  }
}
