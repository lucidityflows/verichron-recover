import { plainToInstance } from 'class-transformer';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EventOrchestratorClient,
  AnalyticsDebtorFocusRequestedDto,
} from '@verichron/event-orchestrator';
import { EventPublisher } from '@verichron/event-publisher';
import { v4 as uuidv4 } from 'uuid';
import { handleServiceError } from '@verichron/error-handling';
import { CollectorAction } from './entities/collector-action.entity';
import {
  DebtorFocusResponseDto,
  LogDebtorActionDto,
  DebtorActionResponseDto,
  CollectorActionListItemDto,
} from './dto';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
} from '@verichron/events';
import type {
  AnalyticsDebtorFocusRequestedPayload,
  CollectorDebtorContactAttemptedPayload,
} from '@verichron/events';
import { DebtorContactAttemptedDto } from '../events/event-dto';
import { SortOrder } from '@verichron/enums';
import type { IDebtorFocusView } from '@verichron/contracts';

/**
 * Workstation Service
 *
 * Core workstation logic:
 * - Debtor 360 focus view (orchestrated)
 * - Logging collector actions
 * - Publishing workstation events
 */
@Injectable()
export class WorkstationService {
  private readonly logger = new Logger(WorkstationService.name);

  constructor(
    @InjectRepository(CollectorAction)
    private readonly collectorActionRepository: Repository<CollectorAction>,
    private readonly orchestratorClient: EventOrchestratorClient,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Find recent collector actions for an organization (internal use)
   */
  async findRecent(organizationId: string, pageSize: number): Promise<CollectorAction[]> {
    try {
      return this.collectorActionRepository.find({
        where: { organizationId },
        order: { actionDate: SortOrder.DESC },
        take: pageSize,
      });
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to get recent collector actions', []);
    }
  }

  /**
   * Get recent collector actions for live activity feed
   */
  async getRecentActions(
    organizationId: string,
    pageSize: number,
    teamId?: string,
  ): Promise<CollectorActionListItemDto[]> {
    try {
      // TODO: Add teamId filtering when team membership data is available
      // For now, we query all actions for the organization
      const actions = await this.collectorActionRepository.find({
        where: { organizationId },
        order: { actionDate: SortOrder.DESC },
        take: pageSize,
      });

      return actions.map(action => ({
        id: action.id,
        timestamp: action.actionDate.toISOString(),
        collectorUserId: action.collectorUserId,
        collectorName: undefined, // TODO: Join with user data
        debtorId: action.debtorProfileId,
        debtorName: undefined, // TODO: Join with debtor data
        actionType: action.actionType,
        outcome: action.outcome,
        content: action.content,
        metadata: action.metadata,
      }));
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to get recent actions', []);
    }
  }

  /**
   * Get comprehensive debtor focus view
   */
  async getDebtorFocus(
    organizationId: string,
    debtorProfileId: string,
  ): Promise<DebtorFocusResponseDto> {
    try {
      this.logger.log(`Requesting focus view for debtor: ${debtorProfileId}`);

      const payload: AnalyticsDebtorFocusRequestedPayload = {
        organizationId,
        debtorProfileId,
        correlationId: uuidv4(),
      };

      const result = await this.orchestratorClient.request<{
        debtorFocusView?: IDebtorFocusView;
        error?: string;
      }, AnalyticsDebtorFocusRequestedDto>(
        EVENT_TOPICS.ORGANIZATIONS,
        EVENT_TYPES.ANALYTICS_DEBTOR_FOCUS_REQUESTED,
        payload,
        AnalyticsDebtorFocusRequestedDto,
      );

      if (!result || result.error || !result.debtorFocusView) {
        throw new ServiceUnavailableException('Debtor focus view unavailable');
      }

      return plainToInstance(DebtorFocusResponseDto, result.debtorFocusView);
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to get debtor focus', [ServiceUnavailableException]);
    }
  }

  /**
   * Log a collector action on a debtor
   */
  async logDebtorAction(
    organizationId: string,
    debtorProfileId: string,
    collectorUserId: string,
    action: LogDebtorActionDto,
  ): Promise<DebtorActionResponseDto> {
    try {
      const actionId = uuidv4();
      const timelineEventId = uuidv4();

      const collectorAction = this.collectorActionRepository.create({
        id: actionId,
        organizationId,
        collectorUserId,
        debtorProfileId,
        actionType: action.actionType,
        content: action.content,
        outcome: action.outcome,
        metadata: action.metadata,
        actionDate: new Date(),
      });
      await this.collectorActionRepository.save(collectorAction);

      if (['CALL', 'EMAIL', 'SMS'].includes(action.actionType)) {
        const contactPayload: CollectorDebtorContactAttemptedPayload = {
          debtorId: debtorProfileId,
          organizationId,
          collectorUserId,
          actionType: action.actionType as any,
          contactDate: new Date().toISOString(),
          outcome: action.outcome as any,
          notes: action.content,
          nextActionDue: action.scheduledFollowUp?.dueDate?.toISOString(),
          attemptedAt: new Date().toISOString(),
        };

        await this.eventPublisher.publish(
          EVENT_TYPES.COLLECTORS_DEBTOR_CONTACT_ATTEMPTED,
          contactPayload,
          DebtorContactAttemptedDto,
        );
      }

      return {
        actionId,
        success: true,
        message: 'Action logged successfully',
        timelineEventId,
      };
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to log action', []);
    }
  }
}