import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  OrchestrationEventEnvelope,
} from '@verichron/events';
import { IGeographicCreditorAnalytics } from '@verichron/contracts';
import {
  AnalyticsGeographicCreditorsRequestedDto,
  AnalyticsGeographicCreditorsCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { AnalyticsAggregationUtil } from '../../../utils';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Geographic Creditors Analytics Orchestrator
 * ========================================================================
 *
 * PURPOSE:
 * Provides geographic distribution analysis of creditor organizations.
 *
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class AnalyticsGeographicCreditorsOrchestrator extends BaseOrchestrator<
  AnalyticsGeographicCreditorsRequestedDto,
  AnalyticsGeographicCreditorsCompletedDto
> {
  protected readonly logger = new Logger(AnalyticsGeographicCreditorsOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsGeographicCreditorsRequestedDto;
  protected readonly responseDtoClass = AnalyticsGeographicCreditorsCompletedDto;
  protected readonly serviceName = 'api-organizations';
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ORGANIZATIONS';

  constructor(
    @Inject('EVENT_ORCHESTRATOR_CONFIG')
    config: EventOrchestratorConfig,
    httpService: HttpService,
    eventPublisher: EventPublisher,
  ) {
    super(config, httpService, eventPublisher);
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    subscriptionName: 'event-orchestrator.analytics.geographic-creditors-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_GEOGRAPHIC_CREDITORS_REQUESTED,
    dto: AnalyticsGeographicCreditorsRequestedDto,
  })
  async handleGeographicCreditorsRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsGeographicCreditorsRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_GEOGRAPHIC_CREDITORS_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsGeographicCreditorsRequestedDto,
  ): Promise<AnalyticsGeographicCreditorsCompletedDto> {
    const { organizationId, correlationId, query } = payload;
    
    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];

    if (!debtServiceUrl) {
      throw new Error(
        'api-debts service endpoint is not configured for geographic creditor analytics.',
      );
    }

    // Build query params
    const queryParamsString = AnalyticsAggregationUtil.buildQueryParams(query);
    const queryParams = Object.fromEntries(new URLSearchParams(queryParamsString).entries());

    // Fetch geographic creditor data from api-debts
    const creditorAnalytics: IGeographicCreditorAnalytics =
      await this.fetchInternal(
        debtServiceUrl,
        `/internal/debts/analytics/geographic/creditors/${organizationId}`,
        'GET',
        null,
        queryParams,
      );

    return {
      organizationId,
      correlationId,
      data: creditorAnalytics,
    };
  }
}