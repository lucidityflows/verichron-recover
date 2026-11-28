import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Param,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../core/dto';
import {
  OrganizationSettingsResponseDto,
  UpdateOrganizationSettingsDto,
  ReplaceOrganizationSettingsDto,
} from './dto';
import { SettingsService } from './settings.service';
import { JwtAuthGuard, PermissionsGuard, Permissions, CurrentUserId } from '@verichron/auth';
import { LenientUUIDPipe } from '../core/pipes';
import { OrganizationPermission, PlatformPermission } from '@verichron/enums';

/**
 * Settings controller handles organization-specific configuration (JSONB)
 */
@ApiTags('Settings')
@ApiBearerAuth()
@Controller('organizations/settings/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.ORGS_SETTINGS_READ, PlatformPermission.ORGS_READ)
  @ApiOperation({
    summary: 'Get organization settings',
    description:
      'Retrieve current organization settings (JSONB). Other services query this endpoint to customize their behavior per tenant.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Settings retrieved successfully',
    type: OrganizationSettingsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
    type: ErrorResponseDto,
  })
  async getSettings(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
  ): Promise<OrganizationSettingsResponseDto> {
    return this.settingsService.getSettings(organizationId);
  }

  @Patch()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.ORGS_SETTINGS_WRITE, PlatformPermission.ORGS_UPDATE)
  @ApiOperation({
    summary: 'Partially update settings',
    description:
      'Partially update organization settings. The provided settings will be merged with existing settings. Publishes OrganizationSettingsUpdated event.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Settings updated successfully',
    type: OrganizationSettingsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid settings data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
    type: ErrorResponseDto,
  })
  async updateSettings(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Body() updateSettingsDto: UpdateOrganizationSettingsDto,
    @CurrentUserId() userId: string,
  ): Promise<OrganizationSettingsResponseDto> {
    return this.settingsService.updateSettings(organizationId, updateSettingsDto, userId);
  }

  @Put()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.ORGS_SETTINGS_WRITE, PlatformPermission.ORGS_UPDATE)
  @ApiOperation({
    summary: 'Replace all settings',
    description:
      'Completely replace organization settings. All existing settings will be removed and replaced with the provided settings. Publishes OrganizationSettingsUpdated event.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Settings replaced successfully',
    type: OrganizationSettingsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid settings data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
    type: ErrorResponseDto,
  })
  async replaceSettings(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Body() replaceSettingsDto: ReplaceOrganizationSettingsDto,
    @CurrentUserId() userId: string,
  ): Promise<OrganizationSettingsResponseDto> {
    return this.settingsService.replaceSettings(organizationId, replaceSettingsDto, userId);
  }
}
