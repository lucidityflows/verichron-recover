import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, Permissions, SkipOrgContext } from '@verichron/auth';
import { PlatformPermission } from '@verichron/enums';
import { CommunicationsOpsService } from './communications.ops.service';
import { QueryLogsDto } from './logs/dto';
import { CommunicationLog } from './logs/schemas/communication-log.schema';
import { Template } from './templates/entities/template.entity';
import { GatewayStatusResponseDto } from './gateways/dto/gateway-status.dto';

@ApiTags('Ops: Communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext()
@Controller('ops/communications')
export class CommunicationsOpsController {
  constructor(private readonly opsService: CommunicationsOpsService) {}

  @Get('logs')
  @Permissions(PlatformPermission.AUDIT_VIEW)
  @ApiOperation({ summary: 'Get global communication logs (System Wide)' })
  @ApiResponse({ status: 200, description: 'A list of communication logs.', type: [CommunicationLog] })
  async findAllLogs(@Query() query: QueryLogsDto) {
    const transformedQuery: any = { ...query };

    if (query.startDate) {
      transformedQuery.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      transformedQuery.endDate = new Date(query.endDate);
    }

    return this.opsService.findAllLogs(transformedQuery);
  }

  @Get('templates')
  @Permissions(PlatformPermission.AUDIT_VIEW)
  @ApiOperation({ summary: 'List all templates across the platform' })
  @ApiResponse({ status: 200, description: 'A list of all templates.', type: [Template] })
  async findAllTemplates(
    @Query('organizationId') organizationId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.opsService.findAllTemplates({ organizationId, isActive });
  }

  @Get('gateways/status')
  @Permissions(PlatformPermission.AUDIT_VIEW)
  @ApiOperation({ summary: 'Get current health and configuration status of communication gateways' })
  @ApiResponse({ status: 200, description: 'Consolidated gateway health report.', type: GatewayStatusResponseDto })
  async getGatewayStatus(): Promise<GatewayStatusResponseDto> {
    return this.opsService.getGatewayStatus() as unknown as GatewayStatusResponseDto;
  }
}
