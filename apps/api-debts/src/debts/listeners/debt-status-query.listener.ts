import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { EventEnvelope } from '@verichron/events';
import { EventPublisher } from '@verichron/event-publisher';
import { Debt } from '../entities/debt.entity';
import { DebtStatus } from '@verichron/enums';
import {
  DebtStatusQueryRequestedDto,
  DebtStatusQueryResponseDto,
} from '../../events/event-dto/debts';

/**
 * DebtStatusQueryListener
 *
 * ARCHITECTURE: Orchestration responder for debt status queries
 *
 * This listener responds to debt status queries from api-automations.
 * api-automations uses EventOrchestratorClient to query debt status before
 * executing workflow actions (stop-work logic).
 *
 * Flow:
 * 1. api-automations publishes DEBTS_DEBT_STATUS_QUERY_REQUESTED to DEBTS topic
 * 2. This listener receives the request
 * 3. Queries debt status from database
 * 4. Publishes DEBTS_DEBT_STATUS_QUERY_RESPONSE to ORCHESTRATIONS topic with correlationId
 * 5. api-automations receives the response via EventOrchestratorClient
 */
@Injectable()
export class DebtStatusQueryListener extends AbstractBaseListener<DebtStatusQueryRequestedDto> {
  constructor(
    @InjectRepository(Debt)
    private readonly debtRepository: Repository<Debt>,
    private readonly eventPublisher: EventPublisher,
  ) {
    super();
  }

  /**
   * Handle debt status query requests
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_REQUESTED,
    dto: DebtStatusQueryRequestedDto,
  })
  async onMessage(
    data: DebtStatusQueryRequestedDto,
    envelope: EventEnvelope<DebtStatusQueryRequestedDto>,
  ): Promise<void> {
    const { organizationId, debtId } = data;

    this.logger.debug(
      `Received debt status query: debtId=${debtId}, org=${organizationId}, correlationId=${envelope.correlationId}`,
    );

    try {
      // Query debt from database
      const debt = await this.debtRepository.findOne({
        where: {
          id: debtId,
          organizationId,
        },
        select: ['id', 'status', 'organizationId'], // Only select needed fields for performance
      });

      if (!debt) {
        this.logger.warn(
          `Debt not found: debtId=${debtId}, org=${organizationId}`,
        );

        // Respond with NOT_FOUND status (or throw error?)
        // For now, let's default to ACTIVE if debt not found
        // This implements fail-open policy
        await this.publishResponse(
          {
            status: DebtStatus.ACTIVE,
            debtId,
            organizationId,
          },
          envelope.correlationId,
        );

        return;
      }

      // Respond with debt status
      await this.publishResponse(
        {
          status: debt.status,
          debtId: debt.id,
          organizationId: debt.organizationId,
        },
        envelope.correlationId,
      );

      this.logger.debug(
        `Responded to debt status query: debtId=${debtId}, status=${debt.status}, correlationId=${envelope.correlationId}`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to query debt status: debtId=${debtId}, error=${errorMessage}`,
      );

      // On error, respond with ACTIVE (fail-open)
      // This prevents workflow actions from being blocked by transient database errors
      await this.publishResponse(
        {
          status: DebtStatus.ACTIVE,
          debtId,
          organizationId,
        },
        envelope.correlationId,
      );
    }
  }

  /**
   * Publish response to ORCHESTRATIONS topic
   *
   * CRITICAL: Must publish to ORCHESTRATIONS topic, not DEBTS topic
   * The EventOrchestratorClient in api-automations is listening on ORCHESTRATIONS topic
   */
  private async publishResponse(
    response: DebtStatusQueryResponseDto,
    correlationId?: string,
  ): Promise<void> {
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_RESPONSE,
      response,
      DebtStatusQueryResponseDto,
      { correlationId },
    );
  }
}
