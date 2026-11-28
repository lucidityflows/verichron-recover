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
  ApiParam,
} from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { JwtAuthGuard, PermissionsGuard, Permissions } from '@verichron/auth';
import { QueryLogsDto } from './dto';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Communication Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communications/logs/orgs/:organizationId')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Query communication logs for an organization' })
  @ApiResponse({
    status: 200,
    description: 'A paginated list of communication logs.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: QueryLogsDto,
  ) {
    const transformedQuery: any = { ...query, organizationId };

    if (query.startDate) {
      transformedQuery.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      transformedQuery.endDate = new Date(query.endDate);
    }

    return this.logsService.findAll(transformedQuery);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Get a specific communication log by ID' })
  @ApiResponse({ status: 200, description: 'The requested communication log.' })
  @ApiResponse({ status: 404, description: 'Log not found.' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id') id: string, // MongoDB ObjectId is not a UUID, so no ParseUUIDPipe
  ) {
    return this.logsService.findOne(id, organizationId);
  }
}
