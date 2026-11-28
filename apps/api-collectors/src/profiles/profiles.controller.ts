import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { CollectorProfileService } from './collector-profile.service';
import {
  CreateCollectorProfileDto,
  UpdateCollectorProfileDto,
  CollectorProfileResponseDto,
  CollectorProfileQueryDto,
  UpdateCollectorStatusDto,
  CollectorCapacityResponseDto,
} from './dto/collector-profile.dto';
import { JwtAuthGuard, Permissions } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Collector - Profiles')
@Controller('collectors/profiles/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CollectorProfileController {
  constructor(private readonly profileService: CollectorProfileService) {}

  @Get()
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({ summary: 'Get collector profiles' })
  @ApiResponse({ status: 200, type: [CollectorProfileResponseDto] })
  async getCollectorProfiles(
    @Param('organizationId') organizationId: string,
    @Query() query: CollectorProfileQueryDto,
  ): Promise<CollectorProfileResponseDto[]> {
    return this.profileService.getCollectorProfiles(organizationId, query);
  }

  @Get('capacity')
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({ summary: 'Get collector capacity information' })
  @ApiResponse({ status: 200, type: CollectorCapacityResponseDto })
  async getCollectorCapacity(
    @Param('organizationId') organizationId: string,
  ): Promise<CollectorCapacityResponseDto> {
    return this.profileService.getCollectorCapacity(organizationId);
  }

  @Get(':profileId')
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({ summary: 'Get collector profile by ID' })
  @ApiResponse({ status: 200, type: CollectorProfileResponseDto })
  async getCollectorProfileById(
    @Param('organizationId') organizationId: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ): Promise<CollectorProfileResponseDto> {
    return this.profileService.getCollectorProfileById(profileId, organizationId);
  }

  @Post()
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({ summary: 'Create collector profile' })
  @ApiResponse({ status: 201, type: CollectorProfileResponseDto })
  async createCollectorProfile(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateCollectorProfileDto,
  ): Promise<CollectorProfileResponseDto> {
    return this.profileService.createCollectorProfile(dto, organizationId);
  }

  @Patch(':profileId')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({ summary: 'Update collector profile' })
  @ApiResponse({ status: 200, type: CollectorProfileResponseDto })
  async updateCollectorProfile(
    @Param('organizationId') organizationId: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateCollectorProfileDto,
  ): Promise<CollectorProfileResponseDto> {
    return this.profileService.updateCollectorProfile(profileId, dto, organizationId);
  }

  @Delete(':profileId')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({ summary: 'Delete collector profile' })
  @ApiResponse({ status: 204 })
  async deleteCollectorProfile(
    @Param('organizationId') organizationId: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ): Promise<void> {
    await this.profileService.deleteCollectorProfile(profileId, organizationId);
  }

  @Patch(':profileId/status')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({ summary: 'Update collector availability status' })
  @ApiResponse({ status: 200, type: CollectorProfileResponseDto })
  async updateCollectorStatus(
    @Param('organizationId') organizationId: string,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateCollectorStatusDto,
  ): Promise<CollectorProfileResponseDto> {
    return this.profileService.updateCollectorStatus(profileId, dto, organizationId);
  }
}
