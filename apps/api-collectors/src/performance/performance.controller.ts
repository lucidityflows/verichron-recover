import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import {
  CollectorTodayStatsDto,
  CollectorWeekStatsDto,
  CollectorLeaderboardDto,
  CollectorDashboardSummaryDto,
  CollectorPerformancePointDto,
} from './dto';
import { TrendGranularity } from '@verichron/enums';
import { JwtAuthGuard, CurrentUserId, Permissions } from '@verichron/auth';
import { TeamAccessGuard } from '../core/guards';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Collector - Performance')
@Controller('collectors/performance/orgs/:organizationId')
@UseGuards(JwtAuthGuard, TeamAccessGuard)
@ApiBearerAuth()
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('stats/today')
  @Permissions(OrganizationPermission.ANALYTICS_READ)
  @ApiOperation({ summary: "Get today's collector performance stats" })
  @ApiResponse({ status: 200, type: CollectorTodayStatsDto })
  async getTodayStats(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUserId() collectorUserId: string,
  ): Promise<CollectorTodayStatsDto> {
    return this.performanceService.getTodayStats(organizationId, collectorUserId);
  }

  @Get('history/:collectorUserId')
  @Permissions(OrganizationPermission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Get historical performance metrics for a collector' })
  @ApiResponse({ status: 200, type: [CollectorPerformancePointDto] })
  @ApiQuery({ name: 'startDate', required: true, description: 'ISO date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'ISO date (YYYY-MM-DD)' })
  async getHistory(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('collectorUserId', ParseUUIDPipe) collectorUserId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<CollectorPerformancePointDto[]> {
    return this.performanceService.getHistory(organizationId, collectorUserId, startDate, endDate);
  }

  @Get('stats/week')
  @Permissions(OrganizationPermission.ANALYTICS_READ)
  @ApiOperation({ summary: "Get this week's collector performance stats" })
  @ApiResponse({ status: 200, type: CollectorWeekStatsDto })
  async getWeekStats(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUserId() collectorUserId: string,
  ): Promise<CollectorWeekStatsDto> {
    return this.performanceService.getWeekStats(organizationId, collectorUserId);
  }

  @Get('dashboard-summary')
  @Permissions(OrganizationPermission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Get complete collector dashboard summary' })
  @ApiResponse({ status: 200, type: CollectorDashboardSummaryDto })
  async getDashboardSummary(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUserId() collectorUserId: string,
    @Query('teamId') teamId?: string,
  ): Promise<CollectorDashboardSummaryDto> {
    return this.performanceService.getDashboardSummary(organizationId, collectorUserId, teamId);
  }

  @Get('leaderboard')
  @Permissions(OrganizationPermission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Get team leaderboard' })
  @ApiResponse({ status: 200, type: CollectorLeaderboardDto })
  async getLeaderboard(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUserId() collectorUserId: string,
    @Query('period') period: TrendGranularity = TrendGranularity.MONTHLY,
    @Query('pageSize') pageSize = 10,
    @Query('teamId') teamId?: string,
  ): Promise<CollectorLeaderboardDto> {
    return this.performanceService.getLeaderboard(
      organizationId,
      collectorUserId,
      period,
      pageSize,
      teamId,
    );
  }
}
