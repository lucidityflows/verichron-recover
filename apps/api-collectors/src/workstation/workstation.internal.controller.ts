import { Controller, Get, Param, Query, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WorkstationService } from './workstation.service';
import { CollectorAction } from './entities/collector-action.entity';
import { Public } from '@verichron/auth';

@ApiTags('Workstation (Internal)')
@Controller('internal/collectors/workstation')
export class WorkstationInternalController {
  constructor(private readonly workstationService: WorkstationService) {}

  @Get('recent-actions/:organizationId')
  @Public()
  @ApiOperation({
    summary: 'Get recent collector actions (internal)',
    description: 'Internal endpoint for event-orchestrator to fetch latest collector actions for the activity feed.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, type: [CollectorAction] })
  async findRecent(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ): Promise<CollectorAction[]> {
    return this.workstationService.findRecent(organizationId, pageSize);
  }
}
