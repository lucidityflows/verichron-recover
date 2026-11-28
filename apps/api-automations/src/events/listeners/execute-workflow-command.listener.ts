import { Injectable, Logger } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, EVENT_SOURCES } from '@verichron/events';
import type { EventEnvelope } from '@verichron/events';
import { DebtVerificationService } from '../../verification/debt-verification.service';
import { EventPublisher } from '@verichron/event-publisher';
import {
  WorkflowActionCompletedDto,
  WorkflowActionFailedDto,
  WorkflowActionSkippedDto,
} from '../event-dto';
import { SendEmailCommandDto } from '../event-dto/communications/send-email-command.dto';
import { SendNotificationCommandDto } from '../event-dto/communications/send-notification-command.dto';
import { WorkQueueItemAssignedDto } from '../event-dto/collectors/work-queue-item-assigned.dto';

interface WorkflowCommandPayload {
  organizationId: string;
  targetEntityId: string;
  targetEntityType: string;
  ruleId?: string;
  ruleName?: string;
  [key: string]: any;
}

/**
 * ExecuteWorkflowCommandListener
 *
 * ARCHITECTURE: api-automations intercepts ALL workflow commands
 *
 * Flow:
 * 1. Receive workflow command from api-workflows
 * 2. If targetEntityType === 'DEBT', verify debt status (stop-work logic)
 * 3. If verification passes, execute the command (delegate to appropriate service)
 * 4. Publish result event to WORKFLOWS topic (COMPLETED, FAILED, or SKIPPED)
 *
 * This implements the "Command with Implicit Verification" pattern:
 * - Single command published by api-workflows
 * - api-automations verifies atomically before execution
 * - Minimizes race condition window
 * - 50% fewer events than separate verification requests
 */
@Injectable()
export class ExecuteWorkflowCommandListener extends AbstractBaseListener<WorkflowCommandPayload> {
  // private readonly logger = new Logger(ExecuteWorkflowCommandListener.name); // Using base class logger

  constructor(
    private readonly debtVerificationService: DebtVerificationService,
    private readonly eventPublisher: EventPublisher,
  ) {
    super();
  }

  /**
   * Handle workflow command: SEND_EMAIL
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.COMMUNICATIONS,
    eventType: EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_EMAIL,
    dto: SendEmailCommandDto,
  })
  async handleSendEmail(
    data: WorkflowCommandPayload,
    envelope: EventEnvelope<WorkflowCommandPayload>,
  ): Promise<void> {
    await this.executeWorkflowCommand(
      'SEND_EMAIL',
      data,
      envelope,
      async () => {
        // TODO: Delegate to email service
        this.logger.log(`Executing SEND_EMAIL command: ${JSON.stringify(data)}`);
        // For now, just simulate success
      },
    );
  }

  /**
   * Handle workflow command: SEND_NOTIFICATION
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.COMMUNICATIONS,
    eventType: EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_NOTIFICATION,
    dto: SendNotificationCommandDto,
  })
  async handleSendNotification(
    data: WorkflowCommandPayload,
    envelope: EventEnvelope<WorkflowCommandPayload>,
  ): Promise<void> {
    await this.executeWorkflowCommand(
      'SEND_NOTIFICATION',
      data,
      envelope,
      async () => {
        // TODO: Delegate to notification service
        this.logger.log(`Executing SEND_NOTIFICATION command: ${JSON.stringify(data)}`);
      },
    );
  }

  /**
   * Handle workflow command: ASSIGN_TO_COLLECTOR
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.COLLECTORS,
    eventType: EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED,
    dto: WorkQueueItemAssignedDto,
  })
  async handleAssignToCollector(
    data: WorkflowCommandPayload,
    envelope: EventEnvelope<WorkflowCommandPayload>,
  ): Promise<void> {
    // Only handle if triggered by workflows (check eventSource)
    if (envelope.eventSource !== EVENT_SOURCES.WORKFLOWS) {
      return; // Skip non-workflow assignments
    }

    await this.executeWorkflowCommand(
      'ASSIGN_TO_COLLECTOR',
      data,
      envelope,
      async () => {
        // Re-publish to COLLECTORS topic for api-collectors to handle
        await this.eventPublisher.publish(
          EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED,
          data,
          WorkQueueItemAssignedDto,
          { correlationId: envelope.correlationId },
        );
      },
    );
  }

  /**
   * Generic workflow command executor with stop-work logic
   *
   * @param actionType - Type of action (e.g., 'SEND_EMAIL')
   * @param data - Command payload
   * @param envelope - Event envelope
   * @param executeFn - Function to execute if verification passes
   */
  private async executeWorkflowCommand(
    actionType: string,
    data: WorkflowCommandPayload,
    envelope: EventEnvelope<WorkflowCommandPayload>,
    executeFn: () => Promise<void>,
  ): Promise<void> {
    const startTime = Date.now();
    const {
      organizationId,
      targetEntityId,
      targetEntityType,
      ruleId,
      ruleName,
    } = data;

    this.logger.log(
      `Received workflow command: action=${actionType}, target=${targetEntityType}:${targetEntityId}, rule=${ruleName}`,
    );

    try {
      // STOP-WORK LOGIC: Verify debt status if targeting a debt
      if (targetEntityType === 'DEBT') {
        const statusCheck = await this.debtVerificationService.shouldExecuteWorkflowAction(
          organizationId,
          targetEntityId,
        );

        if (!statusCheck.shouldExecute) {
          this.logger.log(
            `⏸️  Skipping workflow action ${actionType}: ${statusCheck.reason}`,
          );

          // Publish SKIPPED result
          await this.publishSkippedResult(
            organizationId,
            ruleId || 'unknown',
            ruleName || 'Unknown Rule',
            actionType,
            targetEntityId,
            targetEntityType,
            statusCheck.reason,
            envelope.correlationId,
          );

          return; // Exit early - don't execute
        }

        this.logger.debug(
          `✅ Debt status check passed (${statusCheck.status}), executing action`,
        );
      }

      // Execute the command
      await executeFn();

      const durationMs = Date.now() - startTime;

      // Publish COMPLETED result
      await this.publishCompletedResult(
        organizationId,
        ruleId || 'unknown',
        ruleName || 'Unknown Rule',
        actionType,
        targetEntityId,
        targetEntityType,
        `Action executed successfully`,
        durationMs,
        envelope.correlationId,
      );

      this.logger.log(
        `✅ Successfully executed workflow action ${actionType} in ${durationMs}ms`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startTime;

      this.logger.error(
        `❌ Failed to execute workflow action ${actionType}: ${errorMessage}`,
      );

      // Publish FAILED result
      await this.publishFailedResult(
        organizationId,
        ruleId || 'unknown',
        ruleName || 'Unknown Rule',
        actionType,
        targetEntityId,
        targetEntityType,
        errorMessage,
        durationMs,
        envelope.correlationId,
      );
    }
  }

  /**
   * Publish COMPLETED result to WORKFLOWS topic
   */
  private async publishCompletedResult(
    organizationId: string,
    ruleId: string,
    ruleName: string,
    actionType: string,
    targetEntityId: string,
    targetEntityType: string,
    result: string,
    durationMs: number,
    correlationId?: string,
  ): Promise<void> {
    await this.eventPublisher.publish(
      EVENT_TYPES.WORKFLOWS_ACTION_COMPLETED,
      {
        organizationId,
        ruleId,
        ruleName,
        actionType,
        targetEntityId,
        targetEntityType,
        result,
        durationMs,
        correlationId,
      },
      WorkflowActionCompletedDto,
      { correlationId },
    );
  }

  /**
   * Publish FAILED result to WORKFLOWS topic
   */
  private async publishFailedResult(
    organizationId: string,
    ruleId: string,
    ruleName: string,
    actionType: string,
    targetEntityId: string,
    targetEntityType: string,
    error: string,
    durationMs: number,
    correlationId?: string,
  ): Promise<void> {
    await this.eventPublisher.publish(
      EVENT_TYPES.WORKFLOWS_ACTION_FAILED,
      {
        organizationId,
        ruleId,
        ruleName,
        actionType,
        targetEntityId,
        targetEntityType,
        error,
        durationMs,
        correlationId,
      },
      WorkflowActionFailedDto,
      { correlationId },
    );
  }

  /**
   * Publish SKIPPED result to WORKFLOWS topic
   */
  private async publishSkippedResult(
    organizationId: string,
    ruleId: string,
    ruleName: string,
    actionType: string,
    targetEntityId: string,
    targetEntityType: string,
    skipReason: string,
    correlationId?: string,
  ): Promise<void> {
    await this.eventPublisher.publish(
      EVENT_TYPES.WORKFLOWS_ACTION_SKIPPED,
      {
        organizationId,
        ruleId,
        ruleName,
        actionType,
        targetEntityId,
        targetEntityType,
        skipReason,
        correlationId,
      },
      WorkflowActionSkippedDto,
      { correlationId },
    );
  }
}
