import { Controller, Post, Get, Body, UseGuards, Headers, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { CheckComplianceDto, ComplianceCheckResponseDto } from './dto/check-compliance.dto';
import { ComplianceStatsDto, ComplianceActivityDto } from './dto/compliance-stats.dto';
import { JwtAuthGuard } from '@verichron/auth';
import { LogsService } from '../logs/logs.service';
import { InternalAnalyticsService } from '../internal/analytics/analytics.service';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller('communications/compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly logsService: LogsService,
    private readonly analyticsService: InternalAnalyticsService,
  ) {}

  @Post('check')
  @ApiOperation({ 
    summary: 'Proactively check communication compliance',
    description: 'Validates a potential communication action against FDCPA, TCPA, and internal rules without performing dispatch.'
  })
  @ApiResponse({ 
    status: 200, 
    type: ComplianceCheckResponseDto,
    description: 'Compliance result'
  })
  async checkCompliance(
    @Body() dto: CheckComplianceDto,
    @Headers('x-org-id') organizationId: string,
  ): Promise<ComplianceCheckResponseDto> {
    const result = await this.complianceService.checkCompliance({
      debtorId: dto.debtorId,
      organizationId,
      communicationType: dto.communicationType,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
    });

    return result;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get compliance prevention statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ 
    status: 200, 
    type: ComplianceStatsDto,
    description: 'Aggregated prevention statistics'
  })
  async getStats(
    @Headers('x-org-id') organizationId: string,
    @Query('days') days = 1,
  ): Promise<ComplianceStatsDto> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.logsService.getComplianceStats(organizationId, startDate, endDate);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent compliance activity feed' })
  @ApiResponse({ 
    status: 200, 
    type: [ComplianceActivityDto],
    description: 'List of recent blocked attempts'
  })
  async getActivity(@Headers('x-org-id') organizationId: string): Promise<ComplianceActivityDto[]> {
    return this.logsService.getRecentBlocked(organizationId) as any;
  }

  @Get('invitation-metrics/:batchId')
  @ApiOperation({ summary: 'Get engagement metrics for an invitation wave' })
  @ApiParam({ name: 'batchId', description: 'Invitation Batch UUID' })
  async getInvitationMetrics(
    @Headers('x-org-id') organizationId: string,
    @Param('batchId') batchId: string,
  ) {
    return this.analyticsService.getInvitationWaveMetrics(organizationId, batchId);
  }
}