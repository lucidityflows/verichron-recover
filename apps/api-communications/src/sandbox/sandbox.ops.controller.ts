import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SandboxService } from './sandbox.service';
import { SandboxOpsDispatchDto } from './dto/sandbox-ops-dispatch.dto';
import { JwtAuthGuard, PermissionsGuard, Permissions, SkipOrgContext } from '@verichron/auth';
import { PlatformPermission } from '@verichron/enums';

@ApiTags('Ops: Sandbox')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext()
@Controller('ops/communications/sandbox')
export class SandboxOpsController {
  constructor(private readonly sandboxService: SandboxService) {}

  @Post('dispatch')
  @Permissions(PlatformPermission.SYSTEM_SETTINGS)
  @ApiOperation({ summary: 'Send a test communication (QA Sandbox)' })
  @ApiResponse({ status: 201, description: 'Test communication dispatched' })
  async dispatch(@Body() dto: SandboxOpsDispatchDto) {
    const { organizationId, ...dispatchDto } = dto;
    return this.sandboxService.dispatch(organizationId, dispatchDto);
  }
}
