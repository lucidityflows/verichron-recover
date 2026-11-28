import { Controller, Get, Post, Param, ParseUUIDPipe, Logger, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { InternalAnalyticsService } from './analytics.service';
import { Public } from '@verichron/auth';
import {
  RecoveryTrendsInternalQueryDto,
  RecoveryTrendsPaymentResponseDto,
  PortfolioPerformanceInternalQueryDto,
  PortfolioPerformancePaymentResponseDto,
  FlowAnalyticsInternalQueryDto,
  FlowAnalyticsPaymentResponseDto,
  DebtorFocusTransactionsResponseDto,
  CollectorPaymentStatsDto,
  OrganizationPaymentStatsDto,
  CollectorDashboardMetricsDto,
} from './dto';

/**
 * Internal Analytics Controller
 *
 * Provides aggregated transaction and payment plan metrics for the event orchestrator.
 * These endpoints are internal-only and should not be exposed externally.
 *
 * Authentication: Global JwtAuthGuard automatically checks for HMAC internal service auth
 * and allows internal service-to-service calls without requiring JWT tokens.
 *
 * Routes: /internal/transactions/analytics/*
 *
 * ROUTING PATTERN: /internal/{service-name}/analytics
 * - Standardized with api-debts (/internal/debts/analytics)
 * - Standardized with api-debtors (/internal/debtors/analytics)
 */
@ApiTags('Internal - Analytics')
@Controller('internal/transactions/analytics')
@Public()
export class InternalAnalyticsController {
  private readonly logger = new Logger(InternalAnalyticsController.name);

  constructor(private readonly analyticsService: InternalAnalyticsService) {}

  @Get('dashboard-summary/:organizationId')
  @ApiOperation({
    summary: 'Get transaction analytics for organization (internal only)',
    description: `
      Aggregates transaction and payment plan metrics for the dashboard.
      Called by the event orchestrator to build the dashboard summary.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'date',
    description: 'Specific date to fetch stats for (ISO 8601)',
    required: false,
    example: '2025-12-20',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction analytics retrieved successfully',
  })
  async getDashboardSummary(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('date') date?: string,
  ) {
    this.logger.log(`[InternalAnalyticsController] getDashboardSummary called for org: ${organizationId} for date: ${date}`);
    try {
      const result = await this.analyticsService.getDashboardSummary(organizationId, date);
      this.logger.log(`[InternalAnalyticsController] Success - returning data: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`[InternalAnalyticsController] Error fetching dashboard summary for org ${organizationId}:`, error);
      throw error;
    }
  }

  @Get('recent/:organizationId')
  @ApiOperation({
    summary: 'Get recent transactions for organization (internal only)',
    description: 'Retrieves the most recent payment transactions for the activity feed.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getRecentTransactions(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.analyticsService.getRecentTransactions(organizationId, pageSize);
  }

  @Get('recovery-trends/:organizationId')
  @ApiOperation({
    summary: 'Get payment data for recovery trends (internal only)',
    description: `
      Retrieves payment transaction data grouped by time period.
      Called by the event orchestrator to build recovery trends.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment trend data retrieved successfully',
    type: RecoveryTrendsPaymentResponseDto,
  })
  async getRecoveryTrends(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: RecoveryTrendsInternalQueryDto,
  ): Promise<RecoveryTrendsPaymentResponseDto> {
    this.logger.log(
      `[InternalAnalyticsController] getRecoveryTrends called for org: ${organizationId}, query: ${JSON.stringify(query)}`,
    );
    try {
      const result = await this.analyticsService.getRecoveryTrends(organizationId, query);
      this.logger.log(`[InternalAnalyticsController] Success - returning ${result.payments.length} payment periods`);
      return result;
    } catch (error) {
      this.logger.error(`[InternalAnalyticsController] Error fetching recovery trends for org ${organizationId}:`, error);
      throw error;
    }
  }

  @Post('portfolio-performance/:organizationId')
  @ApiOperation({
    summary: 'Get payment metrics for portfolio performance (internal only)',
    description: `
      Retrieves payment statistics grouped by portfolio.
      Called by the event orchestrator to build portfolio performance analytics.

      Uses POST because it needs to send debt-to-portfolio mapping in the body.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        query: {
          type: 'object',
          properties: {
            startDate: { type: 'string', example: '2024-01-01' },
            endDate: { type: 'string', example: '2024-12-31' },
            portfolioId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            portfolioIds: { type: 'array', items: { type: 'string' } },
          },
        },
        debtToPortfolioMap: {
          type: 'object',
          additionalProperties: { type: 'string' },
          example: {
            'debt-id-1': 'portfolio-id-1',
            'debt-id-2': 'portfolio-id-1',
            'debt-id-3': 'portfolio-id-2',
          },
        },
      },
      required: ['debtToPortfolioMap'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio payment metrics retrieved successfully',
    type: PortfolioPerformancePaymentResponseDto,
  })
  async getPortfolioPerformance(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body('query') query: PortfolioPerformanceInternalQueryDto,
    @Body('debtToPortfolioMap') debtToPortfolioMap: Record<string, string>,
  ): Promise<PortfolioPerformancePaymentResponseDto> {
    this.logger.log(
      `[InternalAnalyticsController] getPortfolioPerformance called for org: ${organizationId}`,
    );
    try {
      const result = await this.analyticsService.getPortfolioPerformance(
        organizationId,
        query || {},
        debtToPortfolioMap,
      );
      this.logger.log(`[InternalAnalyticsController] Success - returning ${result.portfolios.length} portfolios`);
      return result;
    } catch (error) {
      this.logger.error(`[InternalAnalyticsController] Error fetching portfolio performance for org ${organizationId}:`, error);
      throw error;
    }
  }

  @Get('flow/:organizationId')
  @ApiOperation({
    summary: 'Get payment flow data for Sankey diagrams (internal only)',
    description: `
      Retrieves payment data grouped by dimension for flow visualizations.
      Called by the event orchestrator to build Sankey flow diagrams.

      Note: PAYMENT_METHOD view is not yet supported (requires storing payment method types).
      Currently returns empty results.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Flow analytics data retrieved successfully',
    type: FlowAnalyticsPaymentResponseDto,
  })
  async getFlowAnalytics(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: FlowAnalyticsInternalQueryDto,
  ): Promise<FlowAnalyticsPaymentResponseDto> {
    this.logger.log(
      `[InternalAnalyticsController] getFlowAnalytics called for org: ${organizationId}, view: ${query.view}`,
    );
    try {
      const result = await this.analyticsService.getFlowAnalytics(organizationId, query);
      this.logger.log(
        `[InternalAnalyticsController] Success - returning ${result.paymentsByDimension.length} dimension groups`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[InternalAnalyticsController] Error fetching flow analytics for org ${organizationId}:`, error);
      throw error;
    }
  }

  @Get('debtor-focus/:organizationId/:debtorProfileId')
  @ApiOperation({
    summary: 'Get transaction history and payment plans for a debtor (internal only)',
    description: `
      Retrieves all transactions and active payment plans for a specific debtor.
      Called by the event orchestrator to build the debtor focus view for collectors.

      Returns transaction history with payment details and active payment plan status.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'debtorProfileId',
    description: 'Debtor Profile UUID',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Debtor transactions retrieved successfully',
    type: DebtorFocusTransactionsResponseDto,
  })
  async getDebtorTransactions(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorProfileId', ParseUUIDPipe) debtorProfileId: string,
  ): Promise<DebtorFocusTransactionsResponseDto> {
    this.logger.log(
      `[InternalAnalyticsController] getDebtorTransactions called for debtor: ${debtorProfileId} in org: ${organizationId}`,
    );
    try {
      const result = await this.analyticsService.getDebtorTransactions(organizationId, debtorProfileId);
      this.logger.log(
        `[InternalAnalyticsController] Success - returning ${result.transactions.length} transactions and ${result.paymentPlans.length} payment plans`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[InternalAnalyticsController] Error fetching debtor transactions for debtor ${debtorProfileId}:`,
        error,
      );
      throw error;
    }
  }

  @Get('collector-stats/:organizationId/:collectorUserId')
  @ApiOperation({
    summary: 'Get payment statistics for a collector (internal only)',
    description: `
      Retrieves aggregated payment metrics for a specific collector within a time period.
      Called by api-collectors to calculate performance dashboards.

      Returns total collected, payment counts, unique paying accounts, and payment plan metrics.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'collectorUserId',
    description: 'Collector User UUID',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @ApiQuery({
    name: 'periodStart',
    description: 'Start of reporting period (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
    required: true,
  })
  @ApiQuery({
    name: 'periodEnd',
    description: 'End of reporting period (ISO 8601)',
    example: '2025-01-31T23:59:59.999Z',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Collector payment statistics retrieved successfully',
    type: CollectorPaymentStatsDto,
  })
  async getCollectorStats(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('collectorUserId', ParseUUIDPipe) collectorUserId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ): Promise<CollectorPaymentStatsDto> {
    this.logger.log(
      `[InternalAnalyticsController] getCollectorStats called for collector: ${collectorUserId} in org: ${organizationId}`,
    );
    try {
      const result = await this.analyticsService.getCollectorPaymentStats(
        organizationId,
        collectorUserId,
        new Date(periodStart),
        new Date(periodEnd),
      );
      this.logger.log(
        `[InternalAnalyticsController] Success - collector collected ${result.totalCollected} with ${result.successfulPaymentCount} payments`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[InternalAnalyticsController] Error fetching collector stats for collector ${collectorUserId}:`,
        error,
      );
      throw error;
    }
  }

  @Get('organization-stats/:organizationId')
  @ApiOperation({
    summary: 'Get payment statistics for all collectors in an organization (internal only)',
    description: `
      Retrieves aggregated payment metrics for all collectors in an organization within a time period.
      Called by api-collectors to calculate leaderboards.

      Returns per-collector metrics including total collected, payment counts, and payment plan metrics.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'periodStart',
    description: 'Start of reporting period (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
    required: true,
  })
  @ApiQuery({
    name: 'periodEnd',
    description: 'End of reporting period (ISO 8601)',
    example: '2025-01-31T23:59:59.999Z',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Organization payment statistics retrieved successfully',
    type: OrganizationPaymentStatsDto,
  })
  async getOrganizationStats(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ): Promise<OrganizationPaymentStatsDto> {
    this.logger.log(
      `[InternalAnalyticsController] getOrganizationStats called for org: ${organizationId}`,
    );
    try {
      const result = await this.analyticsService.getOrganizationPaymentStats(
        organizationId,
        new Date(periodStart),
        new Date(periodEnd),
      );
      this.logger.log(
        `[InternalAnalyticsController] Success - returning stats for ${result.collectorStats.length} collectors`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[InternalAnalyticsController] Error fetching organization stats for org ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  @Get('collectors/:collectorUserId/dashboard-metrics')
  @ApiOperation({
    summary: 'Get collector dashboard metrics (period + today in single call)',
    description: `
      Retrieves comprehensive dashboard metrics for a specific collector.
      Returns both the requested period stats AND today's stats in a single response
      to optimize performance for dashboard rendering.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'collectorUserId',
    description: 'Collector User UUID',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @ApiQuery({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @ApiQuery({
    name: 'periodStart',
    description: 'Start of reporting period (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
    required: true,
  })
  @ApiQuery({
    name: 'periodEnd',
    description: 'End of reporting period (ISO 8601)',
    example: '2025-01-31T23:59:59.999Z',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Collector dashboard metrics retrieved successfully',
    type: CollectorDashboardMetricsDto,
  })
  async getCollectorDashboardMetrics(
    @Param('collectorUserId', ParseUUIDPipe) collectorUserId: string,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ): Promise<CollectorDashboardMetricsDto> {
    this.logger.log(
      `[InternalAnalyticsController] getCollectorDashboardMetrics called for collector: ${collectorUserId} in org: ${organizationId}`,
    );
    try {
      const result = await this.analyticsService.getCollectorDashboardMetrics(
        organizationId,
        collectorUserId,
        new Date(periodStart),
        new Date(periodEnd),
      );
      this.logger.log(
        `[InternalAnalyticsController] Success - collector collected ${result.totalCollected} in period, ${result.totalCollectedToday} today`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[InternalAnalyticsController] Error fetching dashboard metrics for collector ${collectorUserId}:`,
        error,
      );
      throw error;
    }
  }
}
