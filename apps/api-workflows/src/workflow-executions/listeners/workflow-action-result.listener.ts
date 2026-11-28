import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { WorkflowExecutionsService } from '../workflow-executions.service';
import {
  WorkflowActionCompletedDto,
  WorkflowActionFailedDto,
  WorkflowActionSkippedDto,
} from '../../events/event-dto';

/**
 * WorkflowActionResultListener
 *
 * Listens for workflow action execution results from api-automations:
 * - WORKFLOWS_ACTION_COMPLETED: Log successful action execution
 * - WORKFLOWS_ACTION_FAILED: Log failed action execution
 * - WORKFLOWS_ACTION_SKIPPED: Log skipped action (stop-work logic triggered)
 *
 * This provides an audit trail for all workflow actions, especially those that were
 * skipped due to stop-work logic (e.g., debt paid before delayed email sent).
 */
@Injectable()
export class WorkflowActionResultListener extends AbstractBaseListener<
  WorkflowActionCompletedDto | WorkflowActionFailedDto | WorkflowActionSkippedDto
> {
  constructor(private readonly workflowExecutionsService: WorkflowExecutionsService) {
    super();
  }

  /**
   * Handle workflow action result events
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.WORKFLOWS,
    eventType: EVENT_TYPES.WORKFLOWS_ACTION_COMPLETED,
    dto: WorkflowActionCompletedDto,
  })
  @EventSubscription({
    topicName: EVENT_TOPICS.WORKFLOWS,
    eventType: EVENT_TYPES.WORKFLOWS_ACTION_FAILED,
    dto: WorkflowActionFailedDto,
  })
  @EventSubscription({
    topicName: EVENT_TOPICS.WORKFLOWS,
    eventType: EVENT_TYPES.WORKFLOWS_ACTION_SKIPPED,
    dto: WorkflowActionSkippedDto,
  })
  async onMessage(
    data:
      | WorkflowActionCompletedDto
      | WorkflowActionFailedDto
      | WorkflowActionSkippedDto,
    envelope: EventEnvelope<
      | WorkflowActionCompletedDto
      | WorkflowActionFailedDto
      | WorkflowActionSkippedDto
    >,
  ): Promise<void> {
    const eventType = envelope.eventType;

    if (eventType === EVENT_TYPES.WORKFLOWS_ACTION_COMPLETED) {
      await this.handleCompleted(data as WorkflowActionCompletedDto);
    } else if (eventType === EVENT_TYPES.WORKFLOWS_ACTION_FAILED) {
      await this.handleFailed(data as WorkflowActionFailedDto);
    } else if (eventType === EVENT_TYPES.WORKFLOWS_ACTION_SKIPPED) {
      await this.handleSkipped(data as WorkflowActionSkippedDto);
    }
  }

  /**
   * Handle successful action execution
   * Currently just logs - could create execution record in future
   */
  private async handleCompleted(
    data: WorkflowActionCompletedDto,
  ): Promise<void> {
    const { ruleId, ruleName, actionType, targetEntityId, result } = data;

    this.logger.log(
      `✅ Workflow action completed: rule=${ruleName} (${ruleId}), action=${actionType}, target=${targetEntityId}, result=${result}`,
    );

    // Future: Create execution record with status=COMPLETED
    // await this.workflowExecutionsService.logCompletedAction(...)
  }

  /**
   * Handle failed action execution
   * Currently just logs - could create execution record in future
   */
  private async handleFailed(data: WorkflowActionFailedDto): Promise<void> {
    const { ruleId, ruleName, actionType, targetEntityId, error } = data;

    this.logger.warn(
      `❌ Workflow action failed: rule=${ruleName} (${ruleId}), action=${actionType}, target=${targetEntityId}, error=${error}`,
    );

    // Future: Create execution record with status=FAILED
    // await this.workflowExecutionsService.logFailedAction(...)
  }

  /**
   * Handle skipped action (stop-work logic triggered)
   * Logs skipped action to workflow_executions for audit trail
   */
  private async handleSkipped(
    data: WorkflowActionSkippedDto,
  ): Promise<void> {
    const {
      organizationId,
      ruleId,
      ruleName,
      actionType,
      targetEntityId,
      skipReason,
    } = data;

    this.logger.log(
      `⏸️  Workflow action skipped: rule=${ruleName} (${ruleId}), action=${actionType}, target=${targetEntityId}, reason=${skipReason}`,
    );

    // Log skipped action for audit trail
    await this.workflowExecutionsService.logSkippedAction(
      organizationId,
      ruleId,
      ruleName,
      targetEntityId,
      { type: actionType }, // Action object (minimal info)
      skipReason,
    );
  }
}
