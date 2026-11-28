import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_SOURCES, EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { OrchestrationEventEnvelope } from '@verichron/events';
import { FlowDimension } from '@verichron/enums';
import { AnalyticsFlowRequestedDto, AnalyticsFlowCompletedDto } from '../../../events/event-dto';
import type { EventOrchestratorConfig } from '@verichron/event-orchestrator';
import { BaseOrchestrator, AnalyticsAggregationUtil } from '@verichron/event-orchestrator';
import { CacheService } from '../../../core/cache';
import { CircuitBreakerService } from '../../../core/circuit-breaker';
import { FlowAnalyticsResponseDto } from '../dto';

/**
 * Flow Analytics Orchestrator (api-analytics)
 *
 * Generates Sankey flow diagrams for organization dashboard.
 * Shows flow by debt category, portfolio, payment method, or state.
 *
 * Cache TTL: 10 minutes
 */
@Injectable()
export class FlowAnalyticsOrchestrator extends BaseOrchestrator<
  AnalyticsFlowRequestedDto,
  AnalyticsFlowCompletedDto
> {
  protected readonly logger = new Logger(FlowAnalyticsOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsFlowRequestedDto;
  protected readonly responseDtoClass = AnalyticsFlowCompletedDto;
  protected readonly serviceName = EVENT_SOURCES.ANALYTICS;
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ANALYTICS';

  private readonly CACHE_TTL = 600; // 10 minutes

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
    subscriptionName: 'api-analytics.flow-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_FLOW_REQUESTED,
    dto: AnalyticsFlowRequestedDto,
  })
  async handleFlowRequested(envelope: OrchestrationEventEnvelope<AnalyticsFlowRequestedDto>) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_FLOW_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsFlowRequestedDto,
  ): Promise<AnalyticsFlowCompletedDto> {
    const { organizationId, correlationId, query } = payload;

    // Check cache
    const cacheKey = this.cacheService.buildKey('analytics:flow', {
      organizationId,
      ...query,
    });

    const cached = await this.cacheService.get<FlowAnalyticsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for flow analytics (org: ${organizationId})`);
      return { organizationId, correlationId, data: cached };
    }

    this.logger.debug(`Cache MISS for flow analytics (org: ${organizationId})`);

    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];
    const debtorServiceUrl = this.config.serviceEndpoints['api-debtors'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];

    if (!debtServiceUrl || !debtorServiceUrl || !transactionServiceUrl) {
      throw new Error('Required service endpoints are not configured');
    }

    const queryParamsString = AnalyticsAggregationUtil.buildQueryParams(query);
    const queryParams = Object.fromEntries(new URLSearchParams(queryParamsString).entries());

    let dimensionData: any[] = [];

    // Fetch data based on view with circuit breaker
    if (query.view === FlowDimension.DEBT_CATEGORY || query.view === FlowDimension.PORTFOLIO) {
      const debtResponse = await this.circuitBreaker.execute('api-debts', () =>
        this.fetchInternal(
          debtServiceUrl,
          `/internal/debts/analytics/flow/${organizationId}`,
          'GET',
          null,
          queryParams,
        ),
      );
      dimensionData = debtResponse.debtsByDimension || [];
    } else if (query.view === FlowDimension.STATE) {
      const debtorResponse = await this.circuitBreaker.execute('api-debtors', () =>
        this.fetchInternal(
          debtorServiceUrl,
          `/internal/debtors/analytics/flow/${organizationId}`,
          'GET',
          null,
          queryParams,
        ),
      );
      dimensionData = debtorResponse.debtorsByDimension || [];
    } else if (query.view === FlowDimension.PAYMENT_METHOD) {
      const transactionResponse = await this.circuitBreaker.execute('api-transactions', () =>
        this.fetchInternal(
          transactionServiceUrl,
          `/internal/transactions/analytics/flow/${organizationId}`,
          'GET',
          null,
          queryParams,
        ),
      );
      dimensionData = transactionResponse.paymentsByDimension || [];
    }

    const response: FlowAnalyticsResponseDto = {
      orgId: organizationId,
      view: query.view,
      nodes: [], // TODO: Transform dimensionData to nodes
      links: [], // TODO: Transform dimensionData to links
      totalValue: '0.00', // TODO: Calculate from dimensionData
      generatedAt: new Date().toISOString(),
    };

    // Cache result
    await this.cacheService.set(cacheKey, response, this.CACHE_TTL);

    return { organizationId, correlationId, data: response };
  }
}
