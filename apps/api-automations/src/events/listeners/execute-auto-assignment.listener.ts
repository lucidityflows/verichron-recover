import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { EventEnvelope } from '@verichron/events';
import { AutoAssignmentService } from '../../auto-assignment/auto-assignment.service';
import { ExecuteAutoAssignmentDto } from '../event-dto';

@Injectable()
export class ExecuteAutoAssignmentListener extends AbstractBaseListener<ExecuteAutoAssignmentDto> {
  constructor(private readonly autoAssignmentService: AutoAssignmentService) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT,
    dto: ExecuteAutoAssignmentDto,
  })
  async onMessage(data: ExecuteAutoAssignmentDto, envelope: EventEnvelope<ExecuteAutoAssignmentDto>) {
    this.logger.debug(
      `Received EXECUTE_AUTO_ASSIGNMENT: config=${data.configId}, org=${data.organizationId}`
    );

    await this.autoAssignmentService.executeAutoAssignment(data);
  }
}
