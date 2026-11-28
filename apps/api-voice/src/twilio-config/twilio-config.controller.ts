import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TwilioConfigService } from './twilio-config.service';
import { CreateTwilioConfigDto } from './dto/create-twilio-config.dto';
import { UpdateTwilioConfigDto } from './dto/update-twilio-config.dto';
import { TwilioConfigResponseDto } from './dto/twilio-config-response.dto';
import { Permissions, JwtAuthGuard, PermissionsGuard } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Voice Configuration')
@ApiBearerAuth()
@Controller('organizations/:organizationId/voice/config')
@UseGuards(JwtAuthGuard)
export class TwilioConfigController {
  constructor(private readonly twilioConfigService: TwilioConfigService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.ORGS_SETTINGS_WRITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Set Twilio credentials for an organization' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Twilio configuration successfully created.',
    type: TwilioConfigResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() createTwilioConfigDto: CreateTwilioConfigDto,
  ): Promise<TwilioConfigResponseDto> {
    return this.twilioConfigService.create(organizationId, createTwilioConfigDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.ORGS_SETTINGS_READ)
  @ApiOperation({ summary: 'Get Twilio configuration for an organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Twilio configuration retrieved.',
    type: TwilioConfigResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findOne(@Param('organizationId', ParseUUIDPipe) organizationId: string): Promise<TwilioConfigResponseDto> {
    return this.twilioConfigService.findOne(organizationId, true) as Promise<TwilioConfigResponseDto>;
  }

  @Patch()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.ORGS_SETTINGS_WRITE)
  @ApiOperation({ summary: 'Update Twilio credentials for an organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Twilio configuration successfully updated.',
    type: TwilioConfigResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() updateTwilioConfigDto: UpdateTwilioConfigDto,
  ): Promise<TwilioConfigResponseDto> {
    return this.twilioConfigService.update(organizationId, updateTwilioConfigDto);
  }

  @Delete()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.ORGS_SETTINGS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete Twilio configuration for an organization' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Twilio configuration successfully deleted.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  remove(@Param('organizationId', ParseUUIDPipe) organizationId: string): Promise<void> {
    return this.twilioConfigService.remove(organizationId);
  }
}