import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscalationRule } from '../../escalation-rules/entities/escalation-rule.entity';
import { EscalationRulesService } from '../escalation-rules.service';
import { EscalationCompletedDto, EscalationFailedDto } from '../../events/event-dto';

/**
 * EscalationResultListener
 *
 * Listens for escalation execution results from api-automations:
 * - AUTOMATIONS_ESCALATION_COMPLETED: Log successful escalation
 * - AUTOMATIONS_ESCALATION_FAILED: Log failed escalation
 *
 * Unlike auto-assignment, escalations don't have auto-disable logic since they're
 * typically critical and need manual review if they're failing consistently.
 */
@Injectable()
export class EscalationResultListener extends AbstractBaseListener<EscalationCompletedDto | EscalationFailedDto> {
  constructor(
    @InjectRepository(EscalationRule)
    private readonly escalationRuleRepository: Repository<EscalationRule>,
  ) {
    super();
  }

  /**
   * Handle escalation results
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_ESCALATION_COMPLETED,
    dto: EscalationCompletedDto,
  })
  @EventSubscription({
    topicName: EVENT_TOPICS.AUTOMATIONS,
    eventType: EVENT_TYPES.AUTOMATIONS_ESCALATION_FAILED,
    dto: EscalationFailedDto,
  })
  async onMessage(data: EscalationCompletedDto | EscalationFailedDto, envelope: EventEnvelope<EscalationCompletedDto | EscalationFailedDto>): Promise<void> {
    if (envelope.eventType === EVENT_TYPES.AUTOMATIONS_ESCALATION_COMPLETED) {
      await this.handleSuccess(data as EscalationCompletedDto);
    } else {
      await this.handleFailure(data as EscalationFailedDto);
    }
  }

  private async handleSuccess(data: EscalationCompletedDto): Promise<void> {
    const { ruleId, ruleName, targetEntityId, escalatedTo, notificationsSent } = data;

    this.logger.log(
      `Escalation completed successfully: rule=${ruleName} (${ruleId}), target=${targetEntityId}, ` +
      `escalatedTo=${escalatedTo}, notifications=${notificationsSent?.join(', ')}`
    );

    const rule = await this.escalationRuleRepository.findOne({
      where: { id: ruleId },
    });

    if (!rule) {
      this.logger.warn(`Escalation rule ${ruleId} not found`);
      return;
    }

    // Increment execution count for analytics
    rule.executionCount = (rule.executionCount || 0) + 1;

    await this.escalationRuleRepository.save(rule);

    this.logger.debug(
      `Updated escalation rule ${ruleId} execution count: ${rule.executionCount}`
    );
  }

  private async handleFailure(data: EscalationFailedDto): Promise<void> {
    const { ruleId, ruleName, targetEntityId, error } = data;

    this.logger.error(
      `Escalation failed: rule=${ruleName} (${ruleId}), target=${targetEntityId}, error=${error}`
    );

    const rule = await this.escalationRuleRepository.findOne({
      where: { id: ruleId },
    });

    if (!rule) {
      this.logger.warn(`Escalation rule ${ruleId} not found`);
      return;
    }

    // Still increment execution count to track total attempts
    rule.executionCount = (rule.executionCount || 0) + 1;

    await this.escalationRuleRepository.save(rule);

    // Log warning for manual review - escalations are critical and shouldn't auto-disable
    this.logger.warn(
      `Escalation rule ${ruleName} (${ruleId}) failed for target ${targetEntityId}. ` +
      `Manual review recommended. Error: ${error}`
    );
  }
}
