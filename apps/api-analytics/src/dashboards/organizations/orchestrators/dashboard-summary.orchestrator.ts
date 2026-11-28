import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_SOURCES,
  EVENT_TOPICS,
  EVENT_TYPES,
} from '@verichron/events';
import type { OrchestrationEventEnvelope } from '@verichron/events';
import type { EventOrchestratorConfig } from '@verichron/event-orchestrator';
import { BaseOrchestrator } from '@verichron/event-orchestrator';
import { AnalyticsDashboardSummaryRequestedDto, AnalyticsDashboardSummaryCompletedDto } from '../../../events/event-dto/analytics';
import { CacheService } from '../../../core/cache';
import { CircuitBreakerService } from '../../../core/circuit-breaker';
import { DashboardSummaryResponseDto } from '../dto';

/**
 * Dashboard Summary Analytics Orchestrator (api-analytics)
 *
 * Provides high-level business intelligence dashboard for organization admins.
 * Aggregates data from multiple services with Redis caching.
 *
 * Cache TTL: 2 minutes (frequently changing data)
 */
@Injectable()
export class DashboardSummaryOrchestrator extends BaseOrchestrator<
  AnalyticsDashboardSummaryRequestedDto,
  AnalyticsDashboardSummaryCompletedDto
> {
  protected readonly logger = new Logger(DashboardSummaryOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsDashboardSummaryRequestedDto;
  protected readonly responseDtoClass = AnalyticsDashboardSummaryCompletedDto;
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
    subscriptionName: 'api-analytics.dashboard-summary-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_REQUESTED,
    dto: AnalyticsDashboardSummaryRequestedDto,
  })
  async handleDashboardSummaryRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsDashboardSummaryRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_COMPLETED,
      async (payload) => this.processDashboardRequest(payload),
    );
  }

  private async processDashboardRequest(
    payload: AnalyticsDashboardSummaryRequestedDto,
  ): Promise<AnalyticsDashboardSummaryCompletedDto> {
    const { organizationId, correlationId, date } = payload;

    // Check cache first
    const cacheKey = this.cacheService.buildKey('analytics:dashboard_summary', {
      organizationId,
      date: date || 'today',
    });

    const cached = await this.cacheService.get<DashboardSummaryResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for dashboard summary (org: ${organizationId})`);
      return {
        organizationId,
        correlationId,
        summary: cached,
      };
    }

    this.logger.debug(`Cache MISS for dashboard summary (org: ${organizationId})`);

    // Service endpoints
    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];
    const debtorServiceUrl = this.config.serviceEndpoints['api-debtors'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];
    const communicationsServiceUrl = this.config.serviceEndpoints['api-communications'];

    if (!debtServiceUrl || !debtorServiceUrl) {
      throw new Error('Required service endpoints are not configured');
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const queryParams = date ? { date } : {};
    const yesterdayParams = { date: yesterdayStr };

    // Fetch data from multiple services in parallel with circuit breaker
    const [
      debtData,
      debtorData,
      todayTransactions,
      yesterdayTransactions,
      todayComms,
      yesterdayComms,
    ] = await Promise.all([
      this.fetchWithCircuitBreaker(
        'api-debts',
        () => this.fetchDebtData(debtServiceUrl, organizationId, queryParams),
      ),
      this.fetchWithCircuitBreaker(
        'api-debtors',
        () => this.fetchDebtorData(debtorServiceUrl, organizationId, queryParams),
      ),
      transactionServiceUrl
        ? this.fetchWithCircuitBreaker(
            'api-transactions',
            () => this.fetchTransactionData(transactionServiceUrl, organizationId, queryParams),
          )
        : Promise.resolve({ todayCollections: 0, todayPaymentPlans: 0, totalCollected: [] }),
      transactionServiceUrl
        ? this.fetchWithCircuitBreaker(
            'api-transactions',
            () =>
              this.fetchTransactionData(transactionServiceUrl, organizationId, yesterdayParams),
          )
        : Promise.resolve({ todayCollections: 0, todayPaymentPlans: 0 }),
      communicationsServiceUrl
        ? this.fetchWithCircuitBreaker('api-communications', () =>
            this.fetchInternal(
              communicationsServiceUrl,
              `/internal/communications/analytics/dashboard-summary/${organizationId}`,
              'GET',
              null,
              queryParams,
            ),
          ).catch(() => ({ todayContacts: 0 }))
        : Promise.resolve({ todayContacts: 0 }),
      communicationsServiceUrl
        ? this.fetchWithCircuitBreaker('api-communications', () =>
            this.fetchInternal(
              communicationsServiceUrl,
              `/internal/communications/analytics/dashboard-summary/${organizationId}`,
              'GET',
              null,
              yesterdayParams,
            ),
          ).catch(() => ({ todayContacts: 0 }))
        : Promise.resolve({ todayContacts: 0 }),
    ]);

    const aggregatedSummary = this.aggregateDashboardResponses([
      debtData,
      debtorData,
      {
        ...todayTransactions,
        todayContacts: todayComms.todayContacts,
        yesterdayCollections: yesterdayTransactions.todayCollections,
        yesterdayPaymentPlans: yesterdayTransactions.todayPaymentPlans,
        yesterdayContacts: yesterdayComms.todayContacts,
      },
    ]);

    // Cache the result
    await this.cacheService.set(cacheKey, aggregatedSummary, this.CACHE_TTL);

    return {
      organizationId,
      correlationId,
      summary: aggregatedSummary,
    };
  }

  private async fetchWithCircuitBreaker<T>(serviceName: string, fn: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(serviceName, fn);
  }

  private async fetchDebtData(
    baseUrl: string,
    organizationId: string,
    queryParams?: Record<string, any>,
  ): Promise<any> {
    return this.fetchInternal(
      baseUrl,
      `/internal/debts/analytics/dashboard-summary/${organizationId}`,
      'GET',
      null,
      queryParams,
    );
  }

  private async fetchDebtorData(
    baseUrl: string,
    organizationId: string,
    queryParams?: Record<string, any>,
  ): Promise<any> {
    return this.fetchInternal(
      baseUrl,
      `/internal/debtors/analytics/dashboard-summary/${organizationId}`,
      'GET',
      null,
      queryParams,
    );
  }

  private async fetchTransactionData(
    baseUrl: string,
    organizationId: string,
    queryParams?: Record<string, any>,
  ): Promise<any> {
    try {
      return await this.fetchInternal(
        baseUrl,
        `/internal/transactions/analytics/dashboard-summary/${organizationId}`,
        'GET',
        null,
        queryParams,
      );
    } catch (error: any) {
      this.logger.error(`[fetchTransactionData] FAILED: ${error.message}`);
      return {
        totalCollected: [],
        todayCollections: 0,
        todayPaymentPlans: 0,
      };
    }
  }

  private aggregateDashboardResponses(responses: any[]): DashboardSummaryResponseDto {
    const initialSummary: DashboardSummaryResponseDto = {
      totalPortfolios: 0,
      totalDebts: 0,
      totalDebtors: 0,
      totalInvested: [],
      totalCollected: [],
      totalOutstanding: 0,
      overallRecoveryRate: 0,
      statusCounts: {
        active: 0,
        paid: 0,
        settled: 0,
        defaulted: 0,
        paymentPlan: 0,
      },
      todayCollections: 0,
      todayPaymentPlans: 0,
      todayContacts: 0,
      yesterdayCollections: 0,
      yesterdayPaymentPlans: 0,
      yesterdayContacts: 0,
      topPortfolios: [],
      generatedAt: new Date(),
    };

    const aggregated = responses.reduce((acc, data) => {
      acc.totalPortfolios += data.totalPortfolios || 0;
      acc.totalDebts += data.totalDebts || 0;
      acc.totalDebtors += data.totalDebtors || 0;

      // Transform time series data to match DTO schema
      if (data.totalInvested) {
        acc.totalInvested = acc.totalInvested.concat(
          data.totalInvested.map((item: any) => ({
            period: item.period || `${item.year}-${item.quarter}`,
            value: item.value,
          }))
        );
      }

      if (data.totalCollected) {
        acc.totalCollected = acc.totalCollected.concat(
          data.totalCollected.map((item: any) => ({
            period: item.period || `${item.year}-${item.quarter}`,
            value: item.value,
          }))
        );
      }

      acc.totalOutstanding += data.totalOutstanding || 0;

      if (data.statusCounts) {
        acc.statusCounts.active += data.statusCounts.active || 0;
        acc.statusCounts.paid += data.statusCounts.paid || 0;
        acc.statusCounts.settled += data.statusCounts.settled || 0;
        acc.statusCounts.defaulted += data.statusCounts.defaulted || 0;
        acc.statusCounts.paymentPlan += data.statusCounts.paymentPlan || 0;
      }

      acc.todayCollections += data.todayCollections || 0;
      acc.todayPaymentPlans += data.todayPaymentPlans || 0;
      acc.todayContacts += data.todayContacts || 0;
      acc.yesterdayCollections += data.yesterdayCollections || 0;
      acc.yesterdayPaymentPlans += data.yesterdayPaymentPlans || 0;
      acc.yesterdayContacts += data.yesterdayContacts || 0;

      // Transform top portfolios to match DTO schema
      if (data.topPortfolios) {
        acc.topPortfolios = acc.topPortfolios.concat(
          data.topPortfolios.map((portfolio: any) => ({
            id: portfolio.id,
            name: portfolio.name,
            value: portfolio.value || portfolio.totalCollected || portfolio.recoveryRate || 0,
          }))
        );
      }

      return acc;
    }, initialSummary);

    const totalCollectedSum = aggregated.totalCollected.reduce(
      (sum: number, item: { value: number }) => sum + item.value,
      0,
    );
    const totalInvestedSum = aggregated.totalInvested.reduce(
      (sum: number, item: { value: number }) => sum + item.value,
      0,
    );

    if (totalInvestedSum > 0) {
      aggregated.overallRecoveryRate = (totalCollectedSum / totalInvestedSum) * 100;
    }

    return aggregated;
  }
}
