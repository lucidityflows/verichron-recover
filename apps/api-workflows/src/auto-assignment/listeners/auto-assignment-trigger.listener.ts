import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoAssignmentConfig } from '../entities/auto-assignment-config.entity';
import { AutoAssignmentExecutorService } from '../auto-assignment-executor.service';
import { DebtCreatedDto } from '../../events/event-dto/debts/debt-created.dto';
import { WorkflowTargetEntityType } from '@verichron/enums';

/**
 * AutoAssignmentTriggerListener
 *
 * Listens for business events that should trigger auto-assignment:
 * - DEBTS_DEBT_CREATED: When a new debt is created
 *
 * For each event, it finds all enabled auto-assignment configurations
 * and executes them via the AutoAssignmentExecutorService.
 *
 * The executor service handles:
 * - Filter validation
 * - Rate limiting
 * - Delayed execution
 * - Publishing commands to api-automations
 */
@Injectable()
export class AutoAssignmentTriggerListener extends AbstractBaseListener<DebtCreatedDto> {
  constructor(
    @InjectRepository(AutoAssignmentConfig)
    private readonly autoAssignmentConfigRepository: Repository<AutoAssignmentConfig>,
    private readonly autoAssignmentExecutorService: AutoAssignmentExecutorService,
  ) {
    super();
  }

  /**
   * Handle DEBT_CREATED events
   * Triggers auto-assignment for newly created debts
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_CREATED,
    dto: DebtCreatedDto,
  })
  async onMessage(data: DebtCreatedDto, envelope: EventEnvelope<DebtCreatedDto>): Promise<void> {
    const { organizationId, debtId, debtorId } = data;

    this.logger.log(`Processing debt-created event for auto-assignment: debt=${debtId}`);

    // Find all enabled auto-assignment configs for this organization
    const configs = await this.autoAssignmentConfigRepository.find({
      where: {
        organizationId,
        enabled: true,
        autoDisabled: false,
      },
    });

    if (configs.length === 0) {
      this.logger.debug(`No enabled auto-assignment configs found for org ${organizationId}`);
      return;
    }

    this.logger.log(`Found ${configs.length} enabled auto-assignment configs for org ${organizationId}`);

    // Execute auto-assignment for each matching config
    for (const config of configs) {
      try {
        const result = await this.autoAssignmentExecutorService.executeAutoAssignment({
          organizationId,
          configId: config.id,
          targetEntityId: debtId || debtorId,
          targetEntityType: debtId ? WorkflowTargetEntityType.ACCOUNT : WorkflowTargetEntityType.DEBTOR,
          targetEntityData: data,
          correlationId: envelope.correlationId,
        });

        if (result.success) {
          this.logger.log(
            `Auto-assignment ${result.commandPublished ? 'executed' : 'scheduled'} for config ${config.name} (${config.id})`
          );
        } else {
          this.logger.debug(
            `Auto-assignment skipped for config ${config.name}: ${result.error}`
          );
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Failed to execute auto-assignment for config ${config.id}: ${errorMessage}`,
          errorStack
        );
        // Continue with other configs - don't let one failure block others
      }
    }
  }
}
