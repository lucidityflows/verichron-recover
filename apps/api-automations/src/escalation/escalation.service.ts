import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { EscalationCompletedDto, EscalationFailedDto } from '../events/event-dto';
import type { ExecuteEscalationPayload } from '@verichron/events';
import { EscalationExecutorService } from './escalation-executor.service';

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    private readonly executor: EscalationExecutorService,
    private readonly eventPublisher: EventPublisher
  ) {}

  /**
   * Execute an escalation and publish result events
   */
  async executeEscalation(payload: ExecuteEscalationPayload): Promise<void> {
    this.logger.debug(
      `Processing escalation: rule=${payload.ruleId}, entity=${payload.targetEntityId}`
    );

    try {
      // Execute escalation
      const result = await this.executor.executeEscalation(payload);

      // Publish completion or failure event
      if (result.success) {
        await this.publishEscalationCompleted(payload, result);
      } else {
        await this.publishEscalationFailed(payload, result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Unexpected error processing escalation: ${errorMessage}`,
        errorStack
      );

      // Publish failure event
      await this.publishEscalationFailed(payload, {
        success: false,
        ruleId: payload.ruleId,
        targetEntityId: payload.targetEntityId,
        notificationsSent: [],
        error: errorMessage,
      });
    }
  }

  /**
   * Publish escalation completed event
   */
  private async publishEscalationCompleted(
    payload: ExecuteEscalationPayload,
    result: { success: boolean; notificationsSent: string[] }
  ): Promise<void> {
    await this.eventPublisher.publish(
      EVENT_TYPES.AUTOMATIONS_ESCALATION_COMPLETED,
      {
        organizationId: payload.organizationId,
        ruleId: payload.ruleId,
        ruleName: payload.ruleName,
        targetEntityId: payload.targetEntityId,
        targetEntityType: payload.targetEntityType,
        escalatedTo: payload.escalateTo,
        escalationTargets: payload.escalationTargets,
        priority: payload.priority,
        notificationsSent: result.notificationsSent,
        correlationId: payload.correlationId,
      },
      EscalationCompletedDto,
      { correlationId: payload.correlationId }
    );

    this.logger.log(
      `Escalation completed: rule=${payload.ruleId}, entity=${payload.targetEntityId}, methods=${result.notificationsSent.join(',')}`
    );
  }

  /**
   * Publish escalation failed event
   */
  private async publishEscalationFailed(
    payload: ExecuteEscalationPayload,
    result: { success: boolean; ruleId: string; targetEntityId: string; reason?: string; error?: string; notificationsSent: string[] }
  ): Promise<void> {
    await this.eventPublisher.publish(
      EVENT_TYPES.AUTOMATIONS_ESCALATION_FAILED,
      {
        organizationId: payload.organizationId,
        ruleId: payload.ruleId,
        targetEntityId: payload.targetEntityId,
        reason: result.reason,
        error: result.error,
        notificationsSent: result.notificationsSent,
        correlationId: payload.correlationId,
      },
      EscalationFailedDto,
      { correlationId: payload.correlationId }
    );

    this.logger.error(
      `Escalation failed: rule=${payload.ruleId}, entity=${payload.targetEntityId}, reason=${result.reason || result.error}`
    );
  }
}
