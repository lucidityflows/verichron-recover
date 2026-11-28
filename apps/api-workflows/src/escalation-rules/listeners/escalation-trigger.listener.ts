import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscalationRule } from '../../escalation-rules/entities/escalation-rule.entity';
import { EscalationExecutorService } from '../../escalation-rules/escalation-executor.service';
import { WorkflowTargetEntityType } from '@verichron/enums';
import { EscalationRulesService } from '../escalation-rules.service';
import { DebtUpdatedDto, PromiseBrokenDto } from '../../events/event-dto';

/**
 * EscalationTriggerListener
 *
 * Listens for business events that should trigger escalation checks:
 * - TRANSACTIONS_PROMISE_BROKEN: When a payment promise is broken
 * - DEBTS_DEBT_UPDATED: When debt is updated (for high-balance escalations)
 *
 * For each event, it finds all enabled escalation rules and executes them
 * via the EscalationExecutorService.
 *
 * The executor service handles:
 * - Cooldown period checking
 * - Condition evaluation
 * - Publishing commands to api-automations
 */
@Injectable()
export class EscalationTriggerListener extends AbstractBaseListener<DebtUpdatedDto | PromiseBrokenDto> {
  constructor(
    @InjectRepository(EscalationRule)
    private readonly escalationRuleRepository: Repository<EscalationRule>,
    private readonly escalationExecutorService: EscalationExecutorService,
  ) {
    super();
  }

  /**
   * Handle events that trigger escalation checks
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.TRANSACTIONS,
    eventType: EVENT_TYPES.TRANSACTIONS_PROMISE_BROKEN,
    dto: PromiseBrokenDto,
  })
  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_UPDATED,
    dto: DebtUpdatedDto,
  })
  async onMessage(data: DebtUpdatedDto | PromiseBrokenDto, envelope: EventEnvelope<DebtUpdatedDto | PromiseBrokenDto>): Promise<void> {
    const { organizationId, debtorId, debtId } = data as any;

    this.logger.log(`Processing event ${envelope.eventType} for escalation: target=${debtorId || debtId}`);

    await this.processEscalationTrigger(
      organizationId,
      debtorId || debtId,
      debtorId ? WorkflowTargetEntityType.DEBTOR : WorkflowTargetEntityType.ACCOUNT,
      data,
      envelope.correlationId
    );
  }

  /**
   * Process escalation trigger for a given entity
   * Finds all enabled escalation rules and executes them
   */
  private async processEscalationTrigger(
    organizationId: string,
    targetEntityId: string,
    targetEntityType: WorkflowTargetEntityType,
    targetEntityData: any,
    correlationId?: string
  ): Promise<void> {
    // Find all enabled escalation rules
    const rules = await this.escalationRuleRepository.find({
      where: {
        organizationId,
        enabled: true,
      },
    });

    if (rules.length === 0) {
      this.logger.debug(`No enabled escalation rules found for org ${organizationId}`);
      return;
    }

    this.logger.log(`Found ${rules.length} enabled escalation rules for org ${organizationId}`);

    // Execute each matching rule
    for (const rule of rules) {
      try {
        const result = await this.escalationExecutorService.executeEscalation({
          organizationId,
          ruleId: rule.id,
          targetEntityId,
          targetEntityType,
          targetEntityData,
          correlationId,
        });

        if (result.success) {
          this.logger.log(
            `Escalation executed for rule ${rule.name} (${rule.id})`
          );
        } else {
          this.logger.debug(
            `Escalation skipped for rule ${rule.name}: ${result.skippedReason || result.error}`
          );
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Failed to execute escalation rule ${rule.id}: ${errorMessage}`,
          errorStack
        );
        // Continue with other rules - don't let one failure block others
      }
    }
  }
}
