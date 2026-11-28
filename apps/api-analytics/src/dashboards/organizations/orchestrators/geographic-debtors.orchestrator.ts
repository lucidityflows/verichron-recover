import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_SOURCES, EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { OrchestrationEventEnvelope } from '@verichron/events';
import {
  AnalyticsGeographicDebtorsRequestedDto,
  AnalyticsGeographicDebtorsCompletedDto,
} from '../../../events/event-dto';
import type { EventOrchestratorConfig } from '@verichron/event-orchestrator';
import { BaseOrchestrator, AnalyticsAggregationUtil } from '@verichron/event-orchestrator';
import { CacheService } from '../../../core/cache';
import { CircuitBreakerService } from '../../../core/circuit-breaker';
import { GeographicDebtorAnalyticsResponseDto } from '../dto';

/**
 * Geographic Debtors Analytics Orchestrator (api-analytics)
 *
 * Geographic distribution of debtors by state.
 *
 * Cache TTL: 30 minutes (aggregate data, slow-changing)
 */
@Injectable()
export class GeographicDebtorsOrchestrator extends BaseOrchestrator<
  AnalyticsGeographicDebtorsRequestedDto,
  AnalyticsGeographicDebtorsCompletedDto
> {
  protected readonly logger = new Logger(GeographicDebtorsOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsGeographicDebtorsRequestedDto;
  protected readonly responseDtoClass = AnalyticsGeographicDebtorsCompletedDto;
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
    subscriptionName: 'api-analytics.geographic-debtors-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_GEOGRAPHIC_DEBTORS_REQUESTED,
    dto: AnalyticsGeographicDebtorsRequestedDto,
  })
  async handleGeographicDebtorsRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsGeographicDebtorsRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_GEOGRAPHIC_DEBTORS_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsGeographicDebtorsRequestedDto,
  ): Promise<AnalyticsGeographicDebtorsCompletedDto> {
    const { organizationId, correlationId, query } = payload;

    const cacheKey = this.cacheService.buildKey('analytics:geographic_debtors', {
      organizationId,
      ...query,
    });

    const cached = await this.cacheService.get<GeographicDebtorAnalyticsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for geographic debtors (org: ${organizationId})`);
      return { organizationId, correlationId, data: cached };
    }

    this.logger.debug(`Cache MISS for geographic debtors (org: ${organizationId})`);

    const debtorServiceUrl = this.config.serviceEndpoints['api-debtors'];
    if (!debtorServiceUrl) {
      throw new Error('api-debtors endpoint not configured');
    }

    const queryParamsString = AnalyticsAggregationUtil.buildQueryParams(query);
    const queryParams = Object.fromEntries(new URLSearchParams(queryParamsString).entries());

    const response = await this.circuitBreaker.execute('api-debtors', () =>
      this.fetchInternal(
        debtorServiceUrl,
        `/internal/debtors/analytics/geographic/debtors/${organizationId}`,
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
