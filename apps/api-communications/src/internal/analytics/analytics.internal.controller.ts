import { Controller, Get, Post, Param, ParseUUIDPipe, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InternalAnalyticsService } from './analytics.service';
import { Public } from '@verichron/auth';
import {
  DebtorFocusCommunicationsResponseDto,
  CollectorCommunicationStatsDto,
  OrganizationCommunicationStatsDto,
  CollectorDashboardMetricsDto,
} from './dto';

/**
 * Internal Analytics Controller
 *
 * Provides communication history for the event orchestrator.
 * These endpoints are internal-only and should not be exposed externally.
 *
 * Authentication: Global JwtAuthGuard automatically checks for X-Internal-API-Key header
 * and allows internal service-to-service calls without requiring JWT tokens.
 *
 * Routes: /internal/communications/analytics/*
 *
 * ROUTING PATTERN: /internal/communications/analytics
 * - Standardized with api-debts (/internal/debts/analytics)
 * - Standardized with api-transactions (/internal/transactions/analytics)
 * - Standardized with api-debtors (/internal/debtors/analytics)
 */
@ApiTags('Internal - Analytics')
@Controller('internal/communications/analytics')
@Public()
export class InternalAnalyticsController {
  constructor(private readonly analyticsService: InternalAnalyticsService) {}

  @Get('dashboard-summary/:organizationId')
  @ApiOperation({
    summary: 'Get communication analytics for organization (internal only)',
    description: `
      Aggregates communication metrics for the dashboard.
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
    description: 'Communication analytics retrieved successfully',
  })
  async getDashboardSummary(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('date') date?: string,
  ) {
    return this.analyticsService.getDashboardSummary(organizationId, date);
  }

  @Get('recent/:organizationId')
  @ApiOperation({
    summary: 'Get recent communications for an organization (internal only)',
    description: 'Retrieves the most recent communication logs for the activity feed.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getRecentLogs(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.analyticsService.getRecentLogs(organizationId, pageSize);
  }

  @Get('debtor-focus/:organizationId/:debtorProfileId')
  @ApiOperation({
    summary: 'Get communication history for a debtor (internal only)',
    description: `
      Retrieves all communication logs for a specific debtor.
      Called by the event orchestrator to build the debtor focus view for collectors.

      Returns communication history with delivery status and engagement metrics.

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
    description: 'Debtor communications retrieved successfully',
    type: DebtorFocusCommunicationsResponseDto,
  })
  async getDebtorCommunications(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorProfileId', ParseUUIDPipe) debtorProfileId: string,
  ): Promise<DebtorFocusCommunicationsResponseDto> {
    return this.analyticsService.getDebtorCommunications(
      organizationId,
      debtorProfileId,
    );
  }

  @Get('collector-stats/:organizationId/:collectorUserId')
  @ApiOperation({
    summary: 'Get communication statistics for a collector (internal only)',
    description: `
      Retrieves aggregated communication metrics for a specific collector within a time period.
      Called by api-collectors to calculate performance dashboards.

      Returns counts of calls, emails, SMS, unique accounts contacted, and email response rates.

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
    description: 'Collector communication statistics retrieved successfully',
    type: CollectorCommunicationStatsDto,
  })
  async getCollectorStats(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('collectorUserId', ParseUUIDPipe) collectorUserId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ): Promise<CollectorCommunicationStatsDto> {
    return this.analyticsService.getCollectorCommunicationStats(
      organizationId,
      collectorUserId,
      new Date(periodStart),
      new Date(periodEnd),
    );
  }

  @Get('organization-stats/:organizationId')
  @ApiOperation({
    summary: 'Get communication statistics for all collectors in an organization (internal only)',
    description: `
      Retrieves aggregated communication metrics for all collectors in an organization within a time period.
      Called by api-collectors to calculate leaderboards.

      Returns per-collector metrics including calls, emails, SMS, unique accounts contacted, and email response rates.

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
    description: 'Organization communication statistics retrieved successfully',
    type: OrganizationCommunicationStatsDto,
  })
  async getOrganizationStats(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ): Promise<OrganizationCommunicationStatsDto> {
    return this.analyticsService.getOrganizationCommunicationStats(
      organizationId,
      new Date(periodStart),
      new Date(periodEnd),
    );
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
    return this.analyticsService.getCollectorDashboardMetrics(
      organizationId,
      collectorUserId,
      new Date(periodStart),
      new Date(periodEnd),
    );
  }
}
