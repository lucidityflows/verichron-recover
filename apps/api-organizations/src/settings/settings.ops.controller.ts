import { Controller, Get, Patch, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, Permissions, SkipOrgContext, CurrentUserId } from '@verichron/auth';
import { PlatformPermission } from '@verichron/enums';
import { SettingsOpsService } from './settings.ops.service';
import { OrganizationSettingsResponseDto, UpdateOrganizationSettingsDto } from './dto';

@ApiTags('Ops: Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext()
@Controller('ops/organizations/settings')
export class SettingsOpsController {
  constructor(private readonly opsService: SettingsOpsService) {}

  @Get(':organizationId')
  @Permissions(PlatformPermission.ORGS_UPDATE)
  @ApiOperation({ summary: 'Get organization settings (Platform Admin)' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: OrganizationSettingsResponseDto })
  async getSettings(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.opsService.getSettings(organizationId);
  }

  @Patch(':organizationId')
  @Permissions(PlatformPermission.ORGS_UPDATE)
  @ApiOperation({ summary: 'Update organization settings (Platform Admin)' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: OrganizationSettingsResponseDto })
  async updateSettings(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdateOrganizationSettingsDto,
    @CurrentUserId() adminId: string,
  ) {
    return this.opsService.updateSettings(organizationId, dto, adminId);
  }
}
