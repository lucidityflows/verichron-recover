import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
  OrganizationId,
  CurrentActor,
} from '@verichron/auth';
import type { IActorSnapshot } from '@verichron/contracts';
import { OrganizationPermission } from '@verichron/enums';
import { AuditsService } from './audits.service';
import {
  AuditQueryDto,
  AuditLogResponseDto,
  AuditLogListResponseDto,
  ChainVerificationResponseDto,
  CreateAuditRequestDto,
  AuditRequestQueryDto,
  AuditRequestResponseDto,
  AuditRequestListResponseDto,
  AuditRequestArtifactResponseDto,
  ArchiveLifecycleRunResponseDto,
  DeepHistoryBridgeResponseDto,
  DeepHistoryReadResponseDto,
  PartitionMaintenanceResponseDto,
  ComplianceBriefResponseDto,
  AuditOperationalMetricsResponseDto,
  AuditCorrectnessCheckResponseDto,
} from './dto';

@ApiTags('Audits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audits/orgs/:organizationId')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'List audit logs for an organization' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: AuditLogListResponseDto })
  async findAll(
    @OrganizationId() organizationId: string,
    @Query() query: AuditQueryDto,
  ): Promise<AuditLogListResponseDto> {
    return this.auditsService.findAll(organizationId, query);
  }

  @Get('entity/:targetType/:targetId')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Get audit trail for a specific entity (chain of custody)' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiParam({ name: 'targetType', description: 'Entity type (e.g., ORGANIZATION, DEBT)' })
  @ApiParam({ name: 'targetId', description: 'Entity ID' })
  @ApiResponse({ status: HttpStatus.OK, type: [AuditLogResponseDto] })
  async getEntityHistory(
    @OrganizationId() organizationId: string,
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditsService.getEntityHistory(organizationId, targetType, targetId);
  }

  @Get('history/bridge')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'List archival windows for deep-history reads' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: DeepHistoryBridgeResponseDto })
  async getDeepHistoryBridge(
    @OrganizationId() organizationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<DeepHistoryBridgeResponseDto> {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required query parameters');
    }
    return this.auditsService.getDeepHistoryBridge(organizationId, startDate, endDate);
  }

  @Get('history/deep')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Read merged deep history from hot and archived storage' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: DeepHistoryReadResponseDto })
  async getDeepHistoryRecords(
    @OrganizationId() organizationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<DeepHistoryReadResponseDto> {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required query parameters');
    }
    return this.auditsService.getDeepHistoryRecords(
      organizationId,
      startDate,
      endDate,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 50,
    );
  }

  @Post('archive/run')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Run archival lifecycle for aged hot data' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiQuery({ name: 'olderThanDays', required: true, type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: ArchiveLifecycleRunResponseDto })
  async runArchiveLifecycle(
    @OrganizationId() organizationId: string,
    @Query('olderThanDays', ParseIntPipe) olderThanDays: number,
  ): Promise<ArchiveLifecycleRunResponseDto> {
    return this.auditsService.runArchiveLifecycle(organizationId, olderThanDays);
  }

  @Post('partitions/maintain')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Ensure rolling future monthly audit partitions exist' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiQuery({ name: 'monthsAhead', required: false, type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PartitionMaintenanceResponseDto })
  async maintainPartitions(
    @OrganizationId() _organizationId: string,
    @Query('monthsAhead') monthsAhead?: string,
  ): Promise<PartitionMaintenanceResponseDto> {
    return this.auditsService.ensureFuturePartitions(
      monthsAhead ? Number(monthsAhead) : 6,
    );
  }

  @Get('verify/:targetType/:targetId')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Verify the integrity of an entity\'s audit chain' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiParam({ name: 'targetType', description: 'Entity type (e.g., ORGANIZATION, DEBT)' })
  @ApiParam({ name: 'targetId', description: 'Entity ID' })
  @ApiResponse({ status: HttpStatus.OK, type: ChainVerificationResponseDto })
  async verifyChain(
    @OrganizationId() organizationId: string,
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ): Promise<ChainVerificationResponseDto> {
    return this.auditsService.verifyChain(organizationId, targetType, targetId);
  }

  @Post('requests')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Create an asynchronous audit generation request' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiBody({ type: CreateAuditRequestDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: AuditRequestResponseDto })
  async createRequest(
    @OrganizationId() organizationId: string,
    @CurrentActor() actor: IActorSnapshot,
    @Body() dto: CreateAuditRequestDto,
  ): Promise<AuditRequestResponseDto> {
    return this.auditsService.createRequest(organizationId, actor, dto);
  }

  @Get('requests')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'List audit generation requests for an organization' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: AuditRequestListResponseDto })
  async findRequests(
    @OrganizationId() organizationId: string,
    @Query() query: AuditRequestQueryDto,
  ): Promise<AuditRequestListResponseDto> {
    return this.auditsService.findRequests(organizationId, query);
  }

  @Get('requests/:requestId')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Get a single audit generation request by ID' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiParam({ name: 'requestId', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: AuditRequestResponseDto })
  async findRequestById(
    @OrganizationId() organizationId: string,
    @Param('requestId') requestId: string,
  ): Promise<AuditRequestResponseDto> {
    try {
      return await this.auditsService.findRequestById(organizationId, requestId);
    } catch (_error) {
      throw new NotFoundException('Audit request not found');
    }
  }

  @Get('requests/:requestId/artifact')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Fetch generated artifact payload for an audit request' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiParam({ name: 'requestId', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: AuditRequestArtifactResponseDto })
  async getRequestArtifact(
    @OrganizationId() organizationId: string,
    @Param('requestId') requestId: string,
  ): Promise<AuditRequestArtifactResponseDto> {
    return this.auditsService.getRequestArtifact(organizationId, requestId);
  }

  @Post('compliance-briefs/run-nightly')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Generate nightly compliance and anomaly brief' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiQuery({ name: 'briefDate', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ComplianceBriefResponseDto })
  async runNightlyComplianceBrief(
    @OrganizationId() organizationId: string,
    @Query('briefDate') briefDate: string,
  ): Promise<ComplianceBriefResponseDto> {
    if (!briefDate) {
      throw new BadRequestException('briefDate is a required query parameter');
    }
    return this.auditsService.runNightlyComplianceBrief(organizationId, briefDate);
  }

  @Get('compliance-briefs/latest')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Get latest compliance and anomaly brief' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: ComplianceBriefResponseDto })
  async getLatestComplianceBrief(
    @OrganizationId() organizationId: string,
  ): Promise<ComplianceBriefResponseDto | null> {
    return this.auditsService.getLatestComplianceBrief(organizationId);
  }

  @Get('metrics/operational')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Get operational metrics for the audits pipeline' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: AuditOperationalMetricsResponseDto })
  async getOperationalMetrics(
    @OrganizationId() organizationId: string,
  ): Promise<AuditOperationalMetricsResponseDto> {
    return this.auditsService.getOperationalMetrics(organizationId);
  }

  @Get('checks/correctness')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Run focused correctness checks for audits pipeline' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: AuditCorrectnessCheckResponseDto })
  async runCorrectnessChecks(
    @OrganizationId() organizationId: string,
  ): Promise<AuditCorrectnessCheckResponseDto> {
    return this.auditsService.runCorrectnessChecks(organizationId);
  }

  @Get(':id')
  @Permissions(OrganizationPermission.AUDITS_READ)
  @ApiOperation({ summary: 'Get a single audit log by ID' })
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: AuditLogResponseDto })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<AuditLogResponseDto> {
    const log = await this.auditsService.findOne(organizationId, id);
    if (!log) {
      throw new NotFoundException('Audit log not found');
    }
    return log;
  }
}
