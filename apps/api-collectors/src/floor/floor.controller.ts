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
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FloorService } from './floor.service';
import { FloorStatusResponseDto } from './dto/floor-status-response.dto';
import { JwtAuthGuard, CurrentUserId, Permissions } from '@verichron/auth';
import { TeamAccessGuard } from '../core/guards';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Collector - Floor View')
@Controller('collectors/floor/orgs/:organizationId')
@UseGuards(JwtAuthGuard, TeamAccessGuard)
@ApiBearerAuth()
export class FloorController {
  constructor(private readonly floorService: FloorService) {}

  @Get('status')
  @Permissions(OrganizationPermission.ANALYTICS_READ)
  @ApiOperation({
    summary: 'Get real-time team status for Floor View',
    description: 'Returns status and daily metrics for all collectors in the lead\'s scope.'
  })
  @ApiQuery({ name: 'teamId', required: false, description: 'Filter by specific team ID' })
  @ApiResponse({ status: 200, type: FloorStatusResponseDto })
  async getFloorStatus(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUserId() userId: string,
    @Query('teamId') teamId?: string,
  ): Promise<FloorStatusResponseDto> {
    return this.floorService.getFloorStatus(organizationId, userId, teamId);
  }
}
