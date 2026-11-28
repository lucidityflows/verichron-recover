import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, Permissions, SkipOrgContext } from '@verichron/auth';
import { PlatformPermission } from '@verichron/enums';
import { SandboxService } from './sandbox.service';
import { SandboxCallDto } from './dto/sandbox-call.dto';
import { SandboxCallResponseDto } from './dto/sandbox-call-response.dto';

@ApiTags('Ops: Voice Sandbox')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext()
@Controller('ops/voice/sandbox')
export class SandboxOpsController {
  constructor(private readonly sandboxService: SandboxService) {}

  @Post('call')
  @Permissions(PlatformPermission.SYSTEM_SETTINGS)
  @ApiOperation({ summary: 'Initiate a test call (Platform Sandbox)' })
  @ApiResponse({ status: 201, description: 'Test call initiated', type: SandboxCallResponseDto })
  async call(@Body() dto: SandboxCallDto): Promise<SandboxCallResponseDto> {
    // Platform users use the 'SYSTEM' organization context for sandbox calls
    return this.sandboxService.initiateCall('SYSTEM', dto);
  }
}
