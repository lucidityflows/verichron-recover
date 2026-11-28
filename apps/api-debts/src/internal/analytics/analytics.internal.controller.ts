import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InternalAnalyticsService } from './analytics.service';
import { Public } from '@verichron/auth';
import {
  RecoveryTrendsInternalQueryDto,
  RecoveryTrendsDebtResponseDto,
  PortfolioPerformanceInternalQueryDto,
  PortfolioPerformanceDebtResponseDto,
  FlowAnalyticsInternalQueryDto,
  FlowAnalyticsDebtResponseDto,
  GeographicDebtsQueryDto,
  GeographicDebtsResponseDto,
  GeographicCreditorsQueryDto,
  GeographicCreditorsResponseDto,
  DebtorFocusDebtsResponseDto,
} from './dto';

/**
 * Internal Analytics Controller
 *
 * Provides aggregated debt and portfolio metrics for the event orchestrator.
 * These endpoints are internal-only and should not be exposed externally.
 */
@ApiTags('Internal - Analytics')
@Controller('internal/debts/analytics')
@Public()
export class InternalAnalyticsController {
  constructor(private readonly analyticsService: InternalAnalyticsService) {}

  @Get('dashboard-summary/:organizationId')
  @ApiOperation({
    summary: 'Get dashboard summary for organization (internal only)',
    description: `
      Aggregates debt and portfolio metrics for the dashboard.
      Called by the event orchestrator to build the dashboard summary.

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
    description: 'Dashboard summary retrieved successfully',
  })
  async getDashboardSummary(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.analyticsService.getDashboardSummary(organizationId);
  }

  @Get('recovery-trends/:organizationId')
  @ApiOperation({
    summary: 'Get debt data for recovery trends (internal only)',
    description: `
      Retrieves debt data grouped by time period.
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
    description: 'Debt trend data retrieved successfully',
    type: RecoveryTrendsDebtResponseDto,
  })
  async getRecoveryTrends(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: RecoveryTrendsInternalQueryDto,
  ): Promise<RecoveryTrendsDebtResponseDto> {
    return this.analyticsService.getRecoveryTrends(organizationId, query);
  }

  @Get('portfolio-performance/:organizationId')
  @ApiOperation({
    summary: 'Get debt metrics for portfolio performance (internal only)',
    description: `
      Retrieves debt statistics for each portfolio.
      Called by the event orchestrator to build portfolio performance analytics.

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
    description: 'Portfolio debt metrics retrieved successfully',
    type: PortfolioPerformanceDebtResponseDto,
  })
  async getPortfolioPerformance(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PortfolioPerformanceInternalQueryDto,
  ): Promise<PortfolioPerformanceDebtResponseDto> {
    return this.analyticsService.getPortfolioPerformance(organizationId, query);
  }

  @Post('debtor-portfolios/:organizationId')
  @ApiOperation({
    summary: 'Get portfolio distribution for a set of debtors (internal only)',
    description: 'Returns which portfolios a batch of debtors belong to.',
  })
  async getDebtorPortfolios(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body('debtorProfileIds') debtorProfileIds: string[],
  ) {
    return this.analyticsService.getDebtorPortfolios(organizationId, debtorProfileIds);
  }

  @Get('flow/:organizationId')
  @ApiOperation({
    summary: 'Get debt flow data for Sankey diagrams (internal only)',
    description: `
      Retrieves debt data grouped by dimension for flow visualizations.
      Called by the event orchestrator to build Sankey flow diagrams.

      Handles DEBT_CATEGORY and PORTFOLIO dimensions.
      Returns empty array for other dimensions (handled by other services).

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
    type: FlowAnalyticsDebtResponseDto,
  })
  async getFlowAnalytics(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: FlowAnalyticsInternalQueryDto,
  ): Promise<FlowAnalyticsDebtResponseDto> {
    return this.analyticsService.getFlowAnalytics(organizationId, query);
  }

  @Get('debt-portfolio-map/:organizationId')
  @ApiOperation({
    summary: 'Get debt-to-portfolio mapping (internal only)',
    description: `
      Returns a lightweight mapping of debt IDs to portfolio IDs.
      Used by the orchestrator to connect payment data to portfolios.

      This endpoint is optimized for performance:
      - Only returns 2 columns (debt ID, portfolio ID)
      - Can be filtered by specific portfolios via query param
      - Response is cacheable with long TTL

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
    description: 'Debt-to-portfolio mapping retrieved successfully',
    schema: {
      type: 'object',
      additionalProperties: { type: 'string' },
      example: {
        'debt-uuid-1': 'portfolio-uuid-1',
        'debt-uuid-2': 'portfolio-uuid-1',
        'debt-uuid-3': 'portfolio-uuid-2',
      },
    },
  })
  async getDebtPortfolioMap(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('portfolioIds') portfolioIds?: string,
  ): Promise<Record<string, string>> {
    // Parse comma-separated portfolioIds if provided
    const portfolioIdArray = portfolioIds
      ? portfolioIds.split(',').filter((id) => id.trim())
      : undefined;

    return this.analyticsService.getDebtPortfolioMap(organizationId, portfolioIdArray);
  }

  @Get('geographic/debts-by-state/:organizationId')
  @ApiOperation({
    summary: 'Get debt financial metrics by state (internal only)',
    description: `
      Aggregates debt financial data by debtor state for geographic visualization.
      Called by the event orchestrator to build geographic debt analytics.

      Returns debt values, counts, status metrics, and recovery rates grouped by state.

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
    description: 'Geographic debt metrics retrieved successfully',
    type: GeographicDebtsResponseDto,
  })
  async getGeographicDebts(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: GeographicDebtsQueryDto,
  ): Promise<GeographicDebtsResponseDto> {
    return this.analyticsService.getGeographicDebts(organizationId, query);
  }

  @Get('geographic/creditors/:organizationId')
  @ApiOperation({
    summary: 'Get creditor geographic metrics (internal only)',
    description: `
      Aggregates creditor and debt data by original creditor location.
      Called by the event orchestrator to build geographic creditor analytics.

      Note: Requires original_creditor_id field and creditor entity-address relationships.
      Current implementation uses placeholder data pending schema updates.

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
    description: 'Geographic creditor metrics retrieved successfully',
    type: GeographicCreditorsResponseDto,
  })
  async getGeographicCreditors(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: GeographicCreditorsQueryDto,
  ): Promise<GeographicCreditorsResponseDto> {
    return this.analyticsService.getGeographicCreditors(organizationId, query);
  }

  @Get('debtor-focus/:organizationId/:debtorProfileId')
  @ApiOperation({
    summary: 'Get all debts for a specific debtor (internal only)',
    description: `
      Retrieves all debt records associated with a specific debtor profile.
      Called by the event orchestrator to build the debtor focus view for collectors.

      Returns individual debt details plus aggregated totals across all debts
      for this debtor within the organization.

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
    description: 'Debtor debts retrieved successfully',
    type: DebtorFocusDebtsResponseDto,
  })
  async getDebtorDebts(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorProfileId', ParseUUIDPipe) debtorProfileId: string,
  ): Promise<DebtorFocusDebtsResponseDto> {
    return this.analyticsService.getDebtorDebts(organizationId, debtorProfileId);
  }
}
