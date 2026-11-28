import { Controller, Post, Param, ParseUUIDPipe, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { InternalAnalyticsService } from '../analytics/analytics.service';

/**
 * Communications Internal Controller
 *
 * Provides internal-only endpoints for cross-service communication.
 * These endpoints use the internal/communications prefix requested by the orchestrator.
 */
@ApiTags('Internal - Communications')
@Controller('internal/communications/analytics/recent')
export class CommunicationsInternalController {
  private readonly logger = new Logger(CommunicationsInternalController.name);

  constructor(private readonly analyticsService: InternalAnalyticsService) {}

  @Post('recent/:organizationId')
  @ApiOperation({
    summary: 'Get recent communications for an organization (internal only)',
    description: 'Retrieves the most recent communication logs for the activity feed.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  async getRecentLogs(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body('pageSize') pageSize?: number,
  ) {
    this.logger.log(`Fetching recent logs for org: ${organizationId}, pageSize: ${pageSize}`);
    return this.analyticsService.getRecentLogs(organizationId, pageSize);
  }
}
