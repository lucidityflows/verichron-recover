import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '@verichron/auth';
import { InternalAnalyticsService } from './analytics.service';
import {
  FlowAnalyticsInternalQueryDto,
  FlowAnalyticsDebtorResponseDto,
  GeographicDebtorsQueryDto,
  GeographicDebtorsResponseDto,
  DebtorFocusProfileResponseDto,
} from './dto';

/**
 * Internal Analytics Controller
 *
 * Provides aggregated debtor metrics for the event orchestrator.
 * These endpoints are internal-only and should not be exposed externally.
 */
@ApiTags('Internal - Analytics')
@Controller('internal/debtors/analytics')
@Public()
export class InternalAnalyticsController {
  constructor(private readonly analyticsService: InternalAnalyticsService) {}

  @Get('dashboard-summary/:organizationId')
  @ApiOperation({
    summary: 'Get dashboard summary for organization (internal only)',
    description: `
      Aggregates debtor metrics for the dashboard.
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

  @Get('flow/:organizationId')
  @ApiOperation({
    summary: 'Get flow analytics for organization (internal only)',
    description: `
      Aggregates debtor data by dimension (e.g., STATE) for flow visualization.
      Called by the event orchestrator to build flow analytics.

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
    description: 'Flow analytics retrieved successfully',
    type: FlowAnalyticsDebtorResponseDto,
  })
  async getFlowAnalytics(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: FlowAnalyticsInternalQueryDto,
  ): Promise<FlowAnalyticsDebtorResponseDto> {
    return this.analyticsService.getFlowAnalytics(organizationId, query);
  }

  @Get('geographic/debtors/:organizationId')
  @ApiOperation({
    summary: 'Get geographic debtor analytics for organization (internal only)',
    description: `
      Aggregates debtor data by state for geographic visualization.
      Called by the event orchestrator to build geographic debtor analytics.

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
    description: 'Geographic debtor analytics retrieved successfully',
    type: GeographicDebtorsResponseDto,
  })
  async getGeographicDebtors(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: GeographicDebtorsQueryDto,
  ): Promise<GeographicDebtorsResponseDto> {
    return this.analyticsService.getGeographicDebtors(organizationId, query);
  }

  @Get('debtor-focus/:organizationId/:debtorProfileId')
  @ApiOperation({
    summary: 'Get debtor profile with contact information (internal only)',
    description: `
      Retrieves complete debtor profile with all contact information.
      Called by the event orchestrator to build the debtor focus view for collectors.

      Returns profile details, addresses, emails, and phone numbers
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
    description: 'Debtor profile retrieved successfully',
    type: DebtorFocusProfileResponseDto,
  })
  async getDebtorProfile(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorProfileId', ParseUUIDPipe) debtorProfileId: string,
  ): Promise<DebtorFocusProfileResponseDto> {
    return this.analyticsService.getDebtorProfile(organizationId, debtorProfileId);
  }
}
