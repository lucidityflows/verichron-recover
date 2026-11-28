import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, OrgContextGuard, PermissionsGuard } from '@verichron/auth';
import { Permissions, OrganizationId, CurrentUserId } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';
import { StrategyService } from './strategy.service';
import { UpdateSettlementStrategyDto, UpdateApprovalLadderDto } from './dto/strategy.dto';
import { SettlementAuthorityMatrix } from './entities/settlement-authority-matrix.entity';
import { ApprovalThreshold } from './entities/approval-threshold.entity';

@ApiTags('Tactical Strategy')
@ApiBearerAuth()
@Controller('organizations/strategy/orgs/:organizationId')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  @Get('settlements/matrix')
  @Permissions(OrganizationPermission.TEAMS_READ)
  @ApiOperation({ summary: 'Get the settlement authority matrix' })
  @ApiParam({ name: 'organizationId', type: 'string' })
  @ApiResponse({ status: 200, type: [SettlementAuthorityMatrix] })
  async getMatrix(@OrganizationId() organizationId: string) {
    return this.strategyService.getSettlementMatrix(organizationId);
  }

  @Patch('settlements/matrix')
  @Permissions(OrganizationPermission.TEAMS_MANAGE)
  @ApiOperation({ summary: 'Update the settlement authority matrix (Audit-First)' })
  @ApiParam({ name: 'organizationId', type: 'string' })
  @ApiResponse({ status: 200, type: [SettlementAuthorityMatrix] })
  async updateMatrix(
    @OrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateSettlementStrategyDto,
  ) {
    return this.strategyService.updateSettlementMatrix(organizationId, userId, dto);
  }

  @Get('settlements/approval-ladder')
  @Permissions(OrganizationPermission.TEAMS_READ)
  @ApiOperation({ summary: 'Get the tiered approval thresholds' })
  @ApiParam({ name: 'organizationId', type: 'string' })
  @ApiResponse({ status: 200, type: [ApprovalThreshold] })
  async getLadder(@OrganizationId() organizationId: string) {
    return this.strategyService.getApprovalLadder(organizationId);
  }

  @Patch('settlements/approval-ladder')
  @Permissions(OrganizationPermission.TEAMS_MANAGE)
  @ApiOperation({ summary: 'Update the tiered approval thresholds (Audit-First)' })
  @ApiParam({ name: 'organizationId', type: 'string' })
  @ApiResponse({ status: 200, type: [ApprovalThreshold] })
  async updateLadder(
    @OrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateApprovalLadderDto,
  ) {
    return this.strategyService.updateApprovalLadder(organizationId, userId, dto);
  }
}
