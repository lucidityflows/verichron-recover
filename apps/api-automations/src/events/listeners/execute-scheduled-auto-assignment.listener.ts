import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { EventEnvelope } from '@verichron/events';
import { AutoAssignmentService } from '../../auto-assignment/auto-assignment.service';
import { ExecuteScheduledAutoAssignmentDto } from '../event-dto';

@Injectable()
export class ExecuteScheduledAutoAssignmentListener extends AbstractBaseListener<ExecuteScheduledAutoAssignmentDto> {
  constructor(private readonly autoAssignmentService: AutoAssignmentService) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_EXECUTE_SCHEDULED_AUTO_ASSIGNMENT,
    dto: ExecuteScheduledAutoAssignmentDto,
  })
  async onMessage(data: ExecuteScheduledAutoAssignmentDto, envelope: EventEnvelope<ExecuteScheduledAutoAssignmentDto>) {
    this.logger.debug(
      `Received EXECUTE_SCHEDULED_AUTO_ASSIGNMENT: config=${data.configId}, org=${data.organizationId}`
    );

    await this.autoAssignmentService.executeScheduledAutoAssignment(data);
  }
}
