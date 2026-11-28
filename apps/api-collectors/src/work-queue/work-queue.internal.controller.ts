import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkQueueService } from './work-queue.service';
import { Public } from '@verichron/auth';

@ApiTags('Work Queue (Internal)')
@Controller('internal/collectors/work-queues')
export class WorkQueueInternalController {
  constructor(private readonly workQueueService: WorkQueueService) {}

  @Post('unassigned')
  @Public()
  @ApiOperation({
    summary: 'Get unassigned work queue items (internal)',
    description: 'Internal endpoint called by event-orchestrator to get unassigned work queue items for auto-assignment. Used by api-workflows scheduler.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unassigned items retrieved successfully',
  })
  async getUnassignedItemsInternal(
    @Body() dto: { organizationId: string; filters?: any; limit?: number },
  ) {
    const items = await this.workQueueService.getUnassignedItems(
      dto.organizationId,
      dto.filters,
      dto.limit || 50,
    );
    return { items };
  }
}