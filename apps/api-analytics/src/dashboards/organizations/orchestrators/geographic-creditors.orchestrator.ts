import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_SOURCES, EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { OrchestrationEventEnvelope } from '@verichron/events';
import {
  AnalyticsGeographicCreditorsRequestedDto,
  AnalyticsGeographicCreditorsCompletedDto,
} from '../../../events/event-dto';
import type { EventOrchestratorConfig } from '@verichron/event-orchestrator';
import { BaseOrchestrator, AnalyticsAggregationUtil } from '@verichron/event-orchestrator';
import { CacheService } from '../../../core/cache';
import { CircuitBreakerService } from '../../../core/circuit-breaker';
import { GeographicCreditorAnalyticsResponseDto } from '../dto';

/**
 * Geographic Creditors Analytics Orchestrator (api-analytics)
 *
 * Geographic distribution of creditors by state.
 *
 * Cache TTL: 30 minutes (aggregate data, slow-changing)
 */
@Injectable()
export class GeographicCreditorsOrchestrator extends BaseOrchestrator<
  AnalyticsGeographicCreditorsRequestedDto,
  AnalyticsGeographicCreditorsCompletedDto
> {
  protected readonly logger = new Logger(GeographicCreditorsOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsGeographicCreditorsRequestedDto;
  protected readonly responseDtoClass = AnalyticsGeographicCreditorsCompletedDto;
  protected readonly serviceName = EVENT_SOURCES.ANALYTICS;
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ANALYTICS';

  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor(
    @Inject('EVENT_ORCHESTRATOR_CONFIG')
    config: EventOrchestratorConfig,
    httpService: HttpService,
    eventPublisher: EventPublisher,
    private readonly cacheService: CacheService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    super(config, httpService, eventPublisher);
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    subscriptionName: 'api-analytics.geographic-creditors-requested.sub',
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

    const cacheKey = this.cacheService.buildKey('analytics:geographic_creditors', {
      organizationId,
      ...query,
    });

    const cached = await this.cacheService.get<GeographicCreditorAnalyticsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for geographic creditors (org: ${organizationId})`);
      return { organizationId, correlationId, data: cached };
    }

    this.logger.debug(`Cache MISS for geographic creditors (org: ${organizationId})`);

    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];
    if (!debtServiceUrl) {
      throw new Error('api-debts endpoint not configured');
    }

    const queryParamsString = AnalyticsAggregationUtil.buildQueryParams(query);
    const queryParams = Object.fromEntries(new URLSearchParams(queryParamsString).entries());

    const response = await this.circuitBreaker.execute('api-debts', () =>
      this.fetchInternal(
        debtServiceUrl,
        `/internal/debts/analytics/geographic/creditors/${organizationId}`,
        'GET',
        null,
        queryParams,
      ),
    );

    // Cache result
    await this.cacheService.set(cacheKey, response, this.CACHE_TTL);

    return { organizationId, correlationId, data: response };
  }
}
