import { Controller, Get, Param, Query, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { CommunicationLog } from './schemas/communication-log.schema';
import { Public } from '@verichron/auth';

@ApiTags('Communications (Internal)')
@Controller('internal/communications/logs')
export class LogsInternalController {
  constructor(private readonly logsService: LogsService) {}

  @Get('recent/:organizationId')
  @Public()
  @ApiOperation({
    summary: 'Get recent communications (internal)',
    description: 'Internal endpoint for event-orchestrator to fetch latest outreach logs for the activity feed.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, type: [CommunicationLog] })
  async findRecent(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ): Promise<CommunicationLog[]> {
    return this.logsService.findRecent(organizationId, pageSize);
  }
}
