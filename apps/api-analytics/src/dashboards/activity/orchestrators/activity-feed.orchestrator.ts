import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_SOURCES, EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { OrchestrationEventEnvelope } from '@verichron/events';
import type { EventOrchestratorConfig } from '@verichron/event-orchestrator';
import { BaseOrchestrator } from '@verichron/event-orchestrator';
import { AnalyticsActivityFeedRequestedDto, AnalyticsActivityFeedCompletedDto } from '../../../events/event-dto/analytics';
import { CacheService } from '../../../core/cache';
import { CircuitBreakerService } from '../../../core/circuit-breaker';
import { ActivityFeedResponseDto } from '../dto';

/**
 * Activity Feed Orchestrator (api-analytics)
 *
 * Event timeline for organization showing recent payments and outreach.
 *
 * Cache TTL: 2 minutes (frequently changing)
 */
@Injectable()
export class ActivityFeedOrchestrator extends BaseOrchestrator<
  AnalyticsActivityFeedRequestedDto,
  AnalyticsActivityFeedCompletedDto
> {
  protected readonly logger = new Logger(ActivityFeedOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsActivityFeedRequestedDto;
  protected readonly responseDtoClass = AnalyticsActivityFeedCompletedDto;
  protected readonly serviceName = EVENT_SOURCES.ANALYTICS;
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ANALYTICS';

  private readonly CACHE_TTL = 120; // 2 minutes

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
    subscriptionName: 'api-analytics.activity-feed-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_ACTIVITY_FEED_REQUESTED,
    dto: AnalyticsActivityFeedRequestedDto,
  })
  async handleActivityFeedRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsActivityFeedRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_ACTIVITY_FEED_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsActivityFeedRequestedDto,
  ): Promise<AnalyticsActivityFeedCompletedDto> {
    const { organizationId, correlationId, pageSize } = payload;

    const cacheKey = this.cacheService.buildKey('analytics:activity_feed', {
      organizationId,
      pageSize,
    });

    const cached = await this.cacheService.get<ActivityFeedResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for activity feed (org: ${organizationId})`);
      return { organizationId, correlationId, activities: cached };
    }

    this.logger.debug(`Cache MISS for activity feed (org: ${organizationId})`);

    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];
    const communicationsServiceUrl = this.config.serviceEndpoints['api-communications'];

    if (!transactionServiceUrl || !communicationsServiceUrl) {
      throw new Error('Required service endpoints are not configured');
    }

    // Fetch recent transactions and communications in parallel
    const limit = pageSize || 50;
    const [transactions, communications] = await Promise.all([
      this.circuitBreaker.execute('api-transactions', () =>
        this.fetchInternal(
          transactionServiceUrl,
          `/internal/transactions/analytics/recent/${organizationId}`,
          'GET',
          null,
          { limit, offset: 0 },
        ),
      ),
      this.circuitBreaker.execute('api-communications', () =>
        this.fetchInternal(
          communicationsServiceUrl,
          `/internal/communications/analytics/recent/${organizationId}`,
          'GET',
          null,
          { limit, offset: 0 },
        ),
      ),
    ]);

    // Merge and sort by timestamp
    const activityList = [
      ...(transactions.transactions || []).map((t: any) => ({ ...t, type: 'transaction' })),
      ...(communications.logs || []).map((c: any) => ({ ...c, type: 'communication' })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const response: ActivityFeedResponseDto = {
      organizationId,
      activities: activityList.slice(0, limit),
    };

    // Cache result
    await this.cacheService.set(cacheKey, response, this.CACHE_TTL);

    return { organizationId, correlationId, activities: response };
  }
}
