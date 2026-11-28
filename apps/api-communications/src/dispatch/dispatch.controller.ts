import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import type { DispatchRequest } from './dispatch.service';

/**
 * Dispatch Controller
 *
 * Handles manual communication dispatch requests
 */
@ApiTags('dispatch')
@Controller('communications/dispatch')
export class DispatchController {
  private readonly logger = new Logger(DispatchController.name);

  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  @ApiOperation({ summary: 'Manually dispatch a communication' })
  @ApiResponse({ status: 201, description: 'Communication dispatched successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Compliance violation' })
  async dispatch(@Body() request: DispatchRequest): Promise<{ logId: string }> {
    this.logger.log(`Manual dispatch request for debtor ${request.debtorId}`);
    const logId = await this.dispatchService.dispatch(request);
    return { logId };
  }
}
