import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkstationService } from './workstation.service';
import {
  DebtorFocusResponseDto,
  LogDebtorActionDto,
  DebtorActionResponseDto,
  CollectorActionListItemDto,
} from './dto';
import { JwtAuthGuard, CurrentUserId, Permissions } from '@verichron/auth';
import { TeamAccessGuard } from '../core/guards';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Collector - Workstation')
@Controller('collectors/workstation/orgs/:organizationId')
@UseGuards(JwtAuthGuard, TeamAccessGuard)
@ApiBearerAuth()
export class WorkstationController {
  constructor(private readonly workstationService: WorkstationService) {}

  @Get('debtors/:debtorProfileId/focus')
  @Permissions(OrganizationPermission.DEBTORS_READ)
  @ApiOperation({ summary: 'Get comprehensive debtor focus view' })
  @ApiResponse({ status: 200, type: DebtorFocusResponseDto })
  async getDebtorFocus(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorProfileId', ParseUUIDPipe) debtorProfileId: string,
  ): Promise<DebtorFocusResponseDto> {
    return this.workstationService.getDebtorFocus(
      organizationId,
      debtorProfileId,
    );
  }

  @Get('actions')
  @Permissions(OrganizationPermission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Get recent collector actions for live activity feed' })
  @ApiResponse({ status: 200, type: [CollectorActionListItemDto] })
  async getRecentActions(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('pageSize') pageSize = 50,
    @Query('teamId') teamId?: string,
  ): Promise<{ data: CollectorActionListItemDto[] }> {
    const actions = await this.workstationService.getRecentActions(
      organizationId,
      pageSize,
      teamId,
    );
    return { data: actions };
  }

  @Post('debtors/:debtorProfileId/actions')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @ApiOperation({ summary: 'Log a collector action on a debtor' })
  @ApiResponse({ status: 201, type: DebtorActionResponseDto })
  async logDebtorAction(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorProfileId', ParseUUIDPipe) debtorProfileId: string,
    @CurrentUserId() collectorUserId: string,
    @Body() action: LogDebtorActionDto,
  ): Promise<DebtorActionResponseDto> {
    return this.workstationService.logDebtorAction(
      organizationId,
      debtorProfileId,
      collectorUserId,
      action,
    );
  }
}