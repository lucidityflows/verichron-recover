import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_SOURCES, EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { OrchestrationEventEnvelope } from '@verichron/events';
import type { IPortfolioPerformance } from '@verichron/contracts';
import { PortfolioSortField, SortOrder } from '@verichron/enums';
import {
  AnalyticsPortfolioPerformanceRequestedDto,
  AnalyticsPortfolioPerformanceCompletedDto,
} from '../../../events/event-dto';
import type { EventOrchestratorConfig } from '@verichron/event-orchestrator';
import { BaseOrchestrator } from '@verichron/event-orchestrator';
import { CacheService } from '../../../core/cache';
import { CircuitBreakerService } from '../../../core/circuit-breaker';
import { PortfolioPerformanceResponseDto } from '../dto';

/**
 * Portfolio Performance Analytics Orchestrator (api-analytics)
 *
 * Comprehensive portfolio-level performance analytics.
 * Compares debt portfolios by recovery rates, ROI, and collection metrics.
 *
 * Cache TTL: 10 minutes (moderate volatility)
 */
@Injectable()
export class PortfolioPerformanceOrchestrator extends BaseOrchestrator<
  AnalyticsPortfolioPerformanceRequestedDto,
  AnalyticsPortfolioPerformanceCompletedDto
> {
  protected readonly logger = new Logger(PortfolioPerformanceOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsPortfolioPerformanceRequestedDto;
  protected readonly responseDtoClass = AnalyticsPortfolioPerformanceCompletedDto;
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
    subscriptionName: 'api-analytics.portfolio-performance-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_PORTFOLIO_PERFORMANCE_REQUESTED,
    dto: AnalyticsPortfolioPerformanceRequestedDto,
  })
  async handlePortfolioPerformanceRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsPortfolioPerformanceRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_PORTFOLIO_PERFORMANCE_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsPortfolioPerformanceRequestedDto,
  ): Promise<AnalyticsPortfolioPerformanceCompletedDto> {
    const { organizationId, correlationId, query } = payload;

    // Check cache
    const cacheKey = this.cacheService.buildKey('analytics:portfolio_performance', {
      organizationId,
      ...query,
    });

    const cached = await this.cacheService.get<PortfolioPerformanceResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for portfolio performance (org: ${organizationId})`);
      return { organizationId, correlationId, data: cached };
    }

    this.logger.debug(`Cache MISS for portfolio performance (org: ${organizationId})`);

    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];

    if (!debtServiceUrl || !transactionServiceUrl) {
      throw new Error('Required service endpoints are not configured');
    }

    // Convert query DTO to plain object for query params
    const queryParams: Record<string, any> = {};
    if (query.startDate) queryParams.startDate = query.startDate;
    if (query.endDate) queryParams.endDate = query.endDate;
    if (query.portfolioId) queryParams.portfolioId = query.portfolioId;
    if (query.portfolioTag) queryParams.portfolioTag = query.portfolioTag;
    if (query.debtCategory) queryParams.debtCategory = query.debtCategory;
    if (query.debtStatus) queryParams.debtStatus = query.debtStatus;
    if (query.sortBy) queryParams.sortBy = query.sortBy;
    if (query.sortOrder) queryParams.sortOrder = query.sortOrder;
    if (query.page) queryParams.page = query.page;
    if (query.pageSize) queryParams.pageSize = query.pageSize;

    // Fetch portfolio debt metrics
    const debtsData = await this.circuitBreaker.execute('api-debts', () =>
      this.fetchInternal(
        debtServiceUrl,
        `/internal/debts/analytics/portfolio-performance/${organizationId}`,
        'GET',
        null,
        queryParams,
      ),
    );

    if (!debtsData.portfolios || debtsData.portfolios.length === 0) {
      const emptyResponse: PortfolioPerformanceResponseDto = {
        orgId: organizationId,
        totalPortfolios: 0,
        portfolios: [],
        overallRecoveryRate: 0,
        totalInvested: '0.00',
        totalPaymentsCollected: '0.00',
        page: query.page || 1,
        pageSize: query.pageSize || 20,
        totalPages: 0,
        generatedAt: new Date().toISOString(),
      };
      return { organizationId, correlationId, data: emptyResponse };
    }

    // Extract portfolio IDs
    const portfolioIds = debtsData.portfolios.map((p: any) => p.portfolioId);

    // Fetch debt-to-portfolio mapping
    const mapping = await this.circuitBreaker.execute('api-debts', () =>
      this.fetchInternal(
        debtServiceUrl,
        `/internal/debts/analytics/debt-portfolio-map/${organizationId}`,
        'GET',
        null,
        { portfolioIds: portfolioIds.join(',') },
      ),
    );

    // Fetch payment metrics
    const paymentsData = await this.circuitBreaker.execute('api-transactions', () =>
      this.fetchInternal(
        transactionServiceUrl,
        `/internal/transactions/analytics/portfolio-performance/${organizationId}`,
        'POST',
        { query, debtToPortfolioMap: mapping },
      ),
    );

    // Merge and calculate
    const portfolios = this.mergePortfolioData(debtsData.portfolios, paymentsData.portfolios);
    portfolios.forEach((p) => this.calculatePerformanceMetrics(p));

    const { totalInvested, totalPaymentsCollected, overallRecoveryRate } =
      this.calculateOverallMetrics(portfolios);

    const sortedPortfolios = this.sortPortfolios(
      portfolios,
      query.sortBy || PortfolioSortField.RECOVERY_RATE,
      query.sortOrder || SortOrder.DESC,
    );

    const response: PortfolioPerformanceResponseDto = {
      orgId: organizationId,
      totalPortfolios: debtsData.totalPortfolios,
      portfolios: sortedPortfolios,
      overallRecoveryRate,
      totalInvested,
      totalPaymentsCollected,
      page: debtsData.page,
      pageSize: debtsData.pageSize,
      totalPages: debtsData.totalPages,
      generatedAt: new Date().toISOString(),
    };

    // Cache result
    await this.cacheService.set(cacheKey, response, this.CACHE_TTL);

    return { organizationId, correlationId, data: response };
  }

  private mergePortfolioData(debtPortfolios: any[], paymentPortfolios: any[]): any[] {
    const paymentMap = new Map(paymentPortfolios.map((p) => [p.portfolioId, p]));
    return debtPortfolios.map((debt) => ({
      ...debt,
      ...(paymentMap.get(debt.portfolioId) || {}),
    }));
  }

  private calculatePerformanceMetrics(portfolio: IPortfolioPerformance): void {
    const principal = parseFloat(portfolio.totalPrincipal || '0');
    const collected = parseFloat(portfolio.totalCollected || '0');
    const purchasePrice = parseFloat(portfolio.purchasePrice || '0');

    // Recovery rate: (totalCollected / totalPrincipal) * 100
    portfolio.recoveryRate = principal > 0 ? (collected / principal) * 100 : 0;

    // ROI: ((totalCollected - purchasePrice) / purchasePrice) * 100
    portfolio.roi = purchasePrice > 0 ? ((collected - purchasePrice) / purchasePrice) * 100 : 0;
  }

  private calculateOverallMetrics(portfolios: any[]): {
    totalInvested: string;
    totalPaymentsCollected: string;
    overallRecoveryRate: number;
  } {
    const totalInvested = portfolios.reduce(
      (sum, p) => sum + parseFloat(p.totalPrincipal || '0'),
      0,
    );
    const totalPaymentsCollected = portfolios.reduce(
      (sum, p) => sum + parseFloat(p.totalCollected || '0'),
      0,
    );
    const overallRecoveryRate =
      totalInvested > 0 ? (totalPaymentsCollected / totalInvested) * 100 : 0;

    return {
      totalInvested: totalInvested.toFixed(2),
      totalPaymentsCollected: totalPaymentsCollected.toFixed(2),
      overallRecoveryRate,
    };
  }

  private sortPortfolios(portfolios: any[], sortBy: PortfolioSortField, sortOrder: SortOrder): any[] {
    return portfolios.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case PortfolioSortField.RECOVERY_RATE:
          comparison = (a.recoveryRate || 0) - (b.recoveryRate || 0);
          break;
        case PortfolioSortField.COLLECTED:
          comparison = parseFloat(a.totalCollected || '0') - parseFloat(b.totalCollected || '0');
          break;
        case PortfolioSortField.ROI:
          comparison = (a.roi || 0) - (b.roi || 0);
          break;
        case PortfolioSortField.DEBT_COUNT:
          comparison = (a.debtCount || 0) - (b.debtCount || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === SortOrder.DESC ? -comparison : comparison;
    });
  }
}
