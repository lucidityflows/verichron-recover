import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../core/dto';
import { DashboardSummaryResponseDto, RecoveryTrendsQueryDto, RecoveryTrendsResponseDto, PortfolioPerformanceQueryDto, PortfolioPerformanceResponseDto, FlowAnalyticsQueryDto, FlowAnalyticsResponseDto, TeamOverviewResponseDto, ActivityFeedResponseDto, GeographicQueryDto, GeographicDebtAgeAnalyticsDto, GeographicCreditorAnalyticsDto, GeographicDebtorAnalyticsDto, GeographicDefaultRiskAnalyticsDto, GeographicLikelihoodToPayAnalyticsDto, GeographicPaymentPlanAnalyticsDto, GeographicResponsivenessAnalyticsDto, GeographicCombinedAnalyticsDto, } from './dto';
import { AnalyticsService } from './analytics.service';

/**
 * Analytics controller handles cross-service data aggregation for dashboards
 * Routes: /organizations/:orgId/dashboard-summary, /organizations/:orgId/analytics/*
 */
@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('organizations/analytics/orgs/:orgId')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard-summary')
  @ApiOperation({
    summary: 'Get dashboard summary',
    description:
      'Get high-level dashboard KPIs aggregated from multiple microservices (api-debts, api-transactions, api-debtors, api-communications)',
  })
  @ApiParam({
    name: 'orgId',
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
    status: HttpStatus.OK,
    description: 'Dashboard summary retrieved successfully',
    type: DashboardSummaryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from dependent services',
    type: ErrorResponseDto,
  })
  async getDashboardSummary(
    @Param('orgId') orgId: string,
    @Query('date') date?: string,
  ): Promise<DashboardSummaryResponseDto> {
    return this.analyticsService.getDashboardSummary(orgId, date);
  }

  @Get('team-overview')
  @ApiOperation({
    summary: 'Get team performance overview',
    description: 'Aggregated view of collector status, workload, and performance across a team or organization.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  @ApiQuery({ name: 'teamId', required: false, description: 'Optional team ID to filter by' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TeamOverviewResponseDto,
  })
  async getTeamOverview(
    @Param('orgId') orgId: string,
    @Query('teamId') teamId?: string,
  ): Promise<TeamOverviewResponseDto> {
    return this.analyticsService.getTeamOverview(orgId, teamId);
  }

  @Get('activity-feed')
  @ApiOperation({
    summary: 'Get organizational activity feed',
    description: 'Real-time stream of payments, outreach, and collector actions.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ActivityFeedResponseDto,
  })
  async getActivityFeed(
    @Param('orgId') orgId: string,
    @Query('pageSize') pageSize?: number,
  ): Promise<ActivityFeedResponseDto> {
    return this.analyticsService.getActivityFeed(orgId, pageSize);
  }

  @Get('recovery-trends')
  @ApiOperation({
    summary: 'Get recovery trends',
    description:
      'Get recovery rate trends over time with configurable granularity (daily, weekly, monthly, quarterly)',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recovery trends retrieved successfully',
    type: RecoveryTrendsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from api-transactions',
    type: ErrorResponseDto,
  })
  async getRecoveryTrends(
    @Param('orgId') orgId: string,
    @Query() query: RecoveryTrendsQueryDto,
  ): Promise<RecoveryTrendsResponseDto> {
    return this.analyticsService.getRecoveryTrends(orgId, query);
  }

  @Get('portfolio-performance')
  @ApiOperation({
    summary: 'Get portfolio performance',
    description:
      'Get portfolio-level performance metrics aggregated from api-debts and api-transactions',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolio performance retrieved successfully',
    type: PortfolioPerformanceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from api-debts or api-transactions',
    type: ErrorResponseDto,
  })
  async getPortfolioPerformance(
    @Param('orgId') orgId: string,
    @Query() query: PortfolioPerformanceQueryDto,
  ): Promise<PortfolioPerformanceResponseDto> {
    return this.analyticsService.getPortfolioPerformance(orgId, query);
  }

  @Get('flow')
  @ApiOperation({
    summary: 'Get flow analytics',
    description:
      'Get Sankey flow diagram data showing value flows by dimension (debt category, portfolio, payment method)',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flow analytics retrieved successfully',
    type: FlowAnalyticsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from api-debts or api-transactions',
    type: ErrorResponseDto,
  })
  async getFlowAnalytics(
    @Param('orgId') orgId: string,
    @Query() query: FlowAnalyticsQueryDto,
  ): Promise<FlowAnalyticsResponseDto> {
    return this.analyticsService.getFlowAnalytics(orgId, query);
  }

  // ============================================================================
  // Geographic Analytics Endpoints
  // ============================================================================

  @Get('geographic/debt-age')
  @ApiOperation({
    summary: 'Get debt age geographic analytics',
    description:
      'Get state-level breakdown of debt ages with recovery rates by age bucket',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Debt age geographic analytics retrieved successfully',
    type: GeographicDebtAgeAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from api-debts',
    type: ErrorResponseDto,
  })
  async getDebtAgeGeographic(
    @Param('orgId') orgId: string,
    @Query() query: GeographicQueryDto,
  ): Promise<GeographicDebtAgeAnalyticsDto> {
    return this.analyticsService.getDebtAgeGeographic(orgId, query);
  }

  @Get('geographic/creditors')
  @ApiOperation({
    summary: 'Get creditor geographic analytics',
    description:
      'Get state-level breakdown of creditors and debt distribution by creditor',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Creditor geographic analytics retrieved successfully',
    type: GeographicCreditorAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from api-debts',
    type: ErrorResponseDto,
  })
  async getCreditorGeographic(
    @Param('orgId') orgId: string,
    @Query() query: GeographicQueryDto,
  ): Promise<GeographicCreditorAnalyticsDto> {
    return this.analyticsService.getCreditorGeographic(orgId, query);
  }

  @Get('geographic/debtors')
  @ApiOperation({
    summary: 'Get debtor geographic analytics',
    description:
      'Get state-level breakdown of debtors, debt values, and recovery rates',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Debtor geographic analytics retrieved successfully',
    type: GeographicDebtorAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from api-debtors',
    type: ErrorResponseDto,
  })
  async getDebtorGeographic(
    @Param('orgId') orgId: string,
    @Query() query: GeographicQueryDto,
  ): Promise<GeographicDebtorAnalyticsDto> {
    return this.analyticsService.getDebtorGeographic(orgId, query);
  }

  @Get('geographic/default-risk')
  @ApiOperation({
    summary: 'Get default risk geographic analytics',
    description:
      'Get state-level breakdown of default risk scores and projected losses',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default risk geographic analytics retrieved successfully',
    type: GeographicDefaultRiskAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from api-debtors',
    type: ErrorResponseDto,
  })
  async getDefaultRiskGeographic(
    @Param('orgId') orgId: string,
    @Query() query: GeographicQueryDto,
  ): Promise<GeographicDefaultRiskAnalyticsDto> {
    return this.analyticsService.getDefaultRiskGeographic(orgId, query);
  }

  @Get('geographic/likelihood-to-pay')
  @ApiOperation({
    summary: 'Get likelihood to pay geographic analytics',
    description:
      'Get state-level breakdown of likelihood to pay scores and projected recovery',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Likelihood to pay geographic analytics retrieved successfully',
    type: GeographicLikelihoodToPayAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from api-debtors',
    type: ErrorResponseDto,
  })
  async getLikelihoodToPayGeographic(
    @Param('orgId') orgId: string,
    @Query() query: GeographicQueryDto,
  ): Promise<GeographicLikelihoodToPayAnalyticsDto> {
    return this.analyticsService.getLikelihoodToPayGeographic(orgId, query);
  }

  @Get('geographic/payment-plans')
  @ApiOperation({
    summary: 'Get payment plan geographic analytics',
    description:
      'Get state-level breakdown of payment plans, success rates, and compliance metrics',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment plan geographic analytics retrieved successfully',
    type: GeographicPaymentPlanAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from api-transactions',
    type: ErrorResponseDto,
  })
  async getPaymentPlanGeographic(
    @Param('orgId') orgId: string,
    @Query() query: GeographicQueryDto,
  ): Promise<GeographicPaymentPlanAnalyticsDto> {
    return this.analyticsService.getPaymentPlanGeographic(orgId, query);
  }

  @Get('geographic/responsiveness')
  @ApiOperation({
    summary: 'Get debtor responsiveness geographic analytics',
    description:
      'Get state-level breakdown of debtor responsiveness, contact attempts, and preferred methods',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Responsiveness geographic analytics retrieved successfully',
    type: GeographicResponsivenessAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from api-communications',
    type: ErrorResponseDto,
  })
  async getResponsivenessGeographic(
    @Param('orgId') orgId: string,
    @Query() query: GeographicQueryDto,
  ): Promise<GeographicResponsivenessAnalyticsDto> {
    return this.analyticsService.getResponsivenessGeographic(orgId, query);
  }

  @Get('geographic/combined')
  @ApiOperation({
    summary: 'Get combined geographic analytics',
    description:
      'Get combined view of debtors, creditors, and geographic flows between states',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Combined geographic analytics retrieved successfully',
    type: GeographicCombinedAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Unable to aggregate data from multiple services',
    type: ErrorResponseDto,
  })
  async getCombinedGeographic(
    @Param('orgId') orgId: string,
    @Query() query: GeographicQueryDto,
  ): Promise<GeographicCombinedAnalyticsDto> {
    return this.analyticsService.getCombinedGeographic(orgId, query);
  }
}


