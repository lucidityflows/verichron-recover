import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  OrchestrationEventEnvelope,
} from '@verichron/events';
import { IPortfolioPerformanceResponse, IPortfolioPerformance } from '@verichron/contracts';
import { PortfolioSortField, SortOrder } from '@verichron/enums';
import {
  AnalyticsPortfolioPerformanceRequestedDto,
  AnalyticsPortfolioPerformanceCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Portfolio Performance Analytics Orchestrator
 * ========================================================================
 *
 * PURPOSE:
 * Provides comprehensive portfolio-level performance analytics comparing
 * debt portfolios by recovery rates, ROI, collection metrics, and debt
 * composition.
 *
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class AnalyticsPortfolioPerformanceOrchestrator extends BaseOrchestrator<
  AnalyticsPortfolioPerformanceRequestedDto,
  AnalyticsPortfolioPerformanceCompletedDto
> {
  protected readonly logger = new Logger(AnalyticsPortfolioPerformanceOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsPortfolioPerformanceRequestedDto;
  protected readonly responseDtoClass = AnalyticsPortfolioPerformanceCompletedDto;
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
    subscriptionName: 'event-orchestrator.analytics.portfolio-performance-requested.sub',
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
    
    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];

    if (!debtServiceUrl || !transactionServiceUrl) {
      throw new Error(
        'Required service endpoints for portfolio performance are not configured.',
      );
    }

    // Step 1: Fetch portfolio debt metrics from api-debts
    const debtsData = await this.fetchPortfolioDebts(
      debtServiceUrl,
      organizationId,
      query,
    );

    if (!debtsData.portfolios || debtsData.portfolios.length === 0) {
      return {
        organizationId,
        correlationId,
        data: {
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
        },
      };
    }

    // Step 2: Extract portfolioIds from the paginated results
    const portfolioIds = debtsData.portfolios.map((p: any) => p.portfolioId);

    // Step 3: Fetch debt-to-portfolio mapping for ONLY these portfolios
    const mapping = await this.fetchDebtPortfolioMap(
      debtServiceUrl,
      organizationId,
      portfolioIds,
    );

    this.logger.log(
      `Fetched mapping for ${Object.keys(mapping).length} debts across ${portfolioIds.length} portfolios`,
    );

    // Step 4: Fetch payment metrics from api-transactions
    const paymentsData = await this.fetchPaymentMetrics(
      transactionServiceUrl,
      organizationId,
      query,
      mapping,
    );

    // Step 5: Merge debt and payment data
    const portfolios = this.mergePortfolioData(
      debtsData.portfolios,
      paymentsData.portfolios,
    );

    // Step 6: Calculate performance metrics
    portfolios.forEach((portfolio) => {
      this.calculatePerformanceMetrics(portfolio);
    });

    // Step 7: Calculate overall metrics
    const { totalInvested, totalPaymentsCollected, overallRecoveryRate } =
      this.calculateOverallMetrics(portfolios);

    // Step 8: Apply sorting
    const sortedPortfolios = this.sortPortfolios(
      portfolios,
      query.sortBy || PortfolioSortField.RECOVERY_RATE,
      query.sortOrder || SortOrder.DESC,
    );

    // Step 9: Build response
    const response: IPortfolioPerformanceResponse = {
      orgId: organizationId,
      totalPortfolios: debtsData.portfolios.length,
      portfolios: sortedPortfolios,
      overallRecoveryRate,
      totalInvested,
      totalPaymentsCollected,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      totalPages: Math.ceil(debtsData.portfolios.length / (query.pageSize || 20)),
      generatedAt: new Date().toISOString(),
    };

    return {
      organizationId,
      correlationId,
      data: response,
    };
  }

  private async fetchPortfolioDebts(
    baseUrl: string,
    organizationId: string,
    query: any,
  ): Promise<any> {
    const params = this.buildQueryParams(query);
    return this.fetchInternal(
      baseUrl,
      `/internal/debts/analytics/portfolio-performance/${organizationId}`,
      'GET',
      null,
      params,
    );
  }

  private async fetchDebtPortfolioMap(
    baseUrl: string,
    organizationId: string,
    portfolioIds: string[],
  ): Promise<Record<string, string>> {
    const portfolioIdsParam = portfolioIds.join(',');
    return this.fetchInternal(
      baseUrl,
      `/internal/debts/analytics/debt-portfolio-map/${organizationId}`,
      'GET',
      null,
      { portfolioIds: portfolioIdsParam },
    );
  }

  private async fetchPaymentMetrics(
    baseUrl: string,
    organizationId: string,
    query: any,
    debtToPortfolioMap: Record<string, string>,
  ): Promise<any> {
    const body = {
      query: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
      debtToPortfolioMap,
    };

    return this.fetchInternal(
      baseUrl,
      `/internal/transactions/analytics/portfolio-performance/${organizationId}`,
      'POST',
      body,
    );
  }

  private mergePortfolioData(
    debtMetrics: any[],
    paymentMetrics: any[],
  ): IPortfolioPerformance[] {
    return debtMetrics.map((debt) => {
      const payment = paymentMetrics.find(
        (p) => p.portfolioId === debt.portfolioId,
      ) || {
        totalCollected: '0.00',
        paymentPlanCount: 0,
        avgDaysToFirstPayment: null,
      };

      return {
        portfolioId: debt.portfolioId,
        portfolioName: debt.portfolioName,
        purchasePrice: debt.purchasePrice,
        totalPrincipal: debt.totalPrincipal,
        totalCollected: payment.totalCollected,
        recoveryRate: 0,
        roi: 0,
        debtCount: debt.debtCount,
        activeDebts: debt.activeDebts,
        paidDebts: debt.paidDebts,
        paymentPlanCount: payment.paymentPlanCount,
        avgDaysToFirstPayment: payment.avgDaysToFirstPayment,
        primaryDebtCategory: debt.primaryDebtCategory,
        portfolioTags: debt.portfolioTags,
      };
    });
  }

  private calculatePerformanceMetrics(portfolio: IPortfolioPerformance): void {
    const totalPrincipal = parseFloat(portfolio.totalPrincipal);
    const totalCollected = parseFloat(portfolio.totalCollected);
    const purchasePrice = parseFloat(portfolio.purchasePrice);

    portfolio.recoveryRate = totalPrincipal > 0
      ? (totalCollected / totalPrincipal) * 100
      : 0;

    portfolio.roi = purchasePrice > 0
      ? ((totalCollected - purchasePrice) / purchasePrice) * 100
      : 0;
  }

  private calculateOverallMetrics(portfolios: IPortfolioPerformance[]): {
    totalInvested: string;
    totalPaymentsCollected: string;
    overallRecoveryRate: number;
  } {
    const totalInvested = portfolios.reduce((sum, p) => sum + parseFloat(p.purchasePrice), 0);
    const totalPaymentsCollected = portfolios.reduce((sum, p) => sum + parseFloat(p.totalCollected), 0);
    const totalPrincipal = portfolios.reduce((sum, p) => sum + parseFloat(p.totalPrincipal), 0);

    const overallRecoveryRate = totalPrincipal > 0
      ? (totalPaymentsCollected / totalPrincipal) * 100
      : 0;

    return {
      totalInvested: totalInvested.toFixed(2),
      totalPaymentsCollected: totalPaymentsCollected.toFixed(2),
      overallRecoveryRate,
    };
  }

  private sortPortfolios(
    portfolios: IPortfolioPerformance[],
    sortBy: PortfolioSortField,
    sortOrder: SortOrder,
  ): IPortfolioPerformance[] {
    const sorted = [...portfolios].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case PortfolioSortField.RECOVERY_RATE:
          comparison = a.recoveryRate - b.recoveryRate;
          break;
        case PortfolioSortField.COLLECTED:
          comparison = parseFloat(a.totalCollected) - parseFloat(b.totalCollected);
          break;
        case PortfolioSortField.ROI:
          comparison = a.roi - b.roi;
          break;
        case PortfolioSortField.DEBT_COUNT:
          comparison = a.debtCount - b.debtCount;
          break;
        default:
          comparison = a.recoveryRate - b.recoveryRate;
      }
      return sortOrder === SortOrder.DESC ? -comparison : comparison;
    });
    return sorted;
  }

  private buildQueryParams(query: any): Record<string, any> {
    const params: Record<string, any> = {};
    if (query.startDate) params.startDate = query.startDate;
    if (query.endDate) params.endDate = query.endDate;
    if (query.portfolioId) params.portfolioId = query.portfolioId;
    if (query.portfolioTag) {
      params.portfolioTag = Array.isArray(query.portfolioTag)
        ? query.portfolioTag.join(',')
        : query.portfolioTag;
    }
    if (query.debtCategory) params.debtCategory = query.debtCategory;
    return params;
  }
}