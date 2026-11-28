import { Controller, Get, Query, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowAnalyticsService } from './workflow-analytics.service';
import { WorkflowAnalyticsResponseDto } from './dto/workflow-analytics-response.dto';
import { Permissions, JwtAuthGuard, PermissionsGuard } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Workflow Analytics')
@ApiBearerAuth()
@Controller('workflows/analytics/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
export class WorkflowAnalyticsController {
  constructor(private readonly workflowAnalyticsService: WorkflowAnalyticsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get comprehensive workflow analytics for an organization' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved workflow analytics.',
    type: WorkflowAnalyticsResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  getAnalytics(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<WorkflowAnalyticsResponseDto> {
    return this.workflowAnalyticsService.getAnalytics(organizationId, startDate, endDate);
  }
}