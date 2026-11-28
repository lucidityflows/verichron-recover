import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
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
import { 
  JwtAuthGuard, 
  PermissionsGuard, 
  Permissions, 
  SkipOrgContext 
} from '@verichron/auth';
import { PlatformPermission } from '@verichron/enums';
import { AuditsOpsService } from './audits.ops.service';
import {
  AuditQueryDto,
  AuditLogListResponseDto,
  ChainVerificationResponseDto,
  AuditSystemStatsResponseDto,
} from './dto';

@ApiTags('Ops: Audits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext()
@Controller('ops/audits')
export class AuditsOpsController {
  constructor(
    private readonly opsService: AuditsOpsService,
  ) {}

  @Get('platform-logs')
  @Permissions(PlatformPermission.AUDIT_VIEW)
  @ApiOperation({ summary: 'List system-level audit logs (Platform Events)' })
  @ApiResponse({ status: HttpStatus.OK, type: AuditLogListResponseDto })
  async findPlatformLogs(
    @Query() query: AuditQueryDto,
  ): Promise<AuditLogListResponseDto> {
    return this.opsService.findPlatformLogs(query);
  }

  @Get('stats')
  @Permissions(PlatformPermission.AUDIT_VIEW)
  @ApiOperation({ summary: 'Get audit system health statistics' })
  @ApiResponse({ status: HttpStatus.OK, type: AuditSystemStatsResponseDto })
  async getStats(): Promise<AuditSystemStatsResponseDto> {
    return this.opsService.getSystemStats();
  }

  @Get('verify/:orgId')
  @Permissions(PlatformPermission.AUDIT_VIEW)
  @ApiOperation({ summary: 'Verify integrity of an organization\'s audit chain' })
  @ApiParam({ name: 'orgId', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: ChainVerificationResponseDto })
  async verifyChain(
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<ChainVerificationResponseDto> {
    // V1 approach: Verify the ORGANIZATION entity itself
    return this.opsService.verifyChain(orgId, 'ORGANIZATION', orgId);
  }
}
