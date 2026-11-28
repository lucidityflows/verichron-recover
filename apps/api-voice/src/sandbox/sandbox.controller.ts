import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SandboxService } from './sandbox.service';
import { SandboxCallDto } from './dto/sandbox-call.dto';
import { JwtAuthGuard, PermissionsGuard, Permissions, OrganizationId } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('QA Sandbox')
@ApiBearerAuth()
@Controller('organizations/:organizationId/voice/sandbox')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SandboxController {
  constructor(private readonly sandboxService: SandboxService) {}

  @Post('call')
  @Permissions(OrganizationPermission.VOICE_MANAGE) // Assume admin/manager
  @ApiOperation({ summary: 'Initiate a test call (QA Sandbox)' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Test call initiated' })
  async call(
    @OrganizationId() organizationId: string,
    @Body() dto: SandboxCallDto,
  ) {
    return this.sandboxService.initiateCall(organizationId, dto);
  }
}
