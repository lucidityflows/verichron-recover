import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, Permissions, SkipOrgContext, CurrentActor } from '@verichron/auth';
import type { IActorSnapshot } from '@verichron/contracts';
import { PlatformPermission, OrganizationStatus } from '@verichron/enums';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationQueryDto,
} from './dto';
import { ProfilesOpsService } from './profiles.ops.service';
import { PaginatedResponseDto } from '../core/dto';
import { LenientUUIDPipe } from '../core/pipes';

@ApiTags('Ops: Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext()
@Controller('ops/organizations/profiles')
export class ProfilesOpsController {
  constructor(private readonly opsService: ProfilesOpsService) {}

  @Post()
  @Permissions(PlatformPermission.ORGS_CREATE)
  @ApiOperation({ summary: 'Create a new organization (Platform Level)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: OrganizationResponseDto })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentActor() actor: IActorSnapshot,
  ): Promise<OrganizationResponseDto> {
    return this.opsService.createOrganization(dto, actor);
  }

  @Get()
  @Permissions(PlatformPermission.ORGS_READ)
  @ApiOperation({ summary: 'List all organizations system-wide' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedResponseDto })
  async findAll(@Query() query: OrganizationQueryDto): Promise<PaginatedResponseDto<OrganizationResponseDto>> {
    return this.opsService.findAllOrganizations(query);
  }

  @Get(':id')
  @Permissions(PlatformPermission.ORGS_READ)
  @ApiOperation({ summary: 'Get organization details by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: OrganizationResponseDto })
  async findOne(@Param('id', LenientUUIDPipe) id: string): Promise<OrganizationResponseDto> {
    return this.opsService.findOneOrganization(id);
  }

  @Patch(':id')
  @Permissions(PlatformPermission.ORGS_UPDATE)
  @ApiOperation({ summary: 'Update organization (Platform Override)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: OrganizationResponseDto })
  async update(
    @Param('id', LenientUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentActor() actor: IActorSnapshot,
  ): Promise<OrganizationResponseDto> {
    return this.opsService.updateOrganization(id, dto, actor);
  }

  @Patch(':id/status')
  @Permissions(PlatformPermission.ORGS_SUSPEND)
  @ApiOperation({ summary: 'Force update organization status (Suspend/Activate)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({ name: 'status', enum: OrganizationStatus })
  @ApiResponse({ status: HttpStatus.OK, type: OrganizationResponseDto })
  async updateStatus(
    @Param('id', LenientUUIDPipe) id: string,
    @Query('status') status: OrganizationStatus,
    @CurrentActor() actor: IActorSnapshot,
  ): Promise<OrganizationResponseDto> {
    return this.opsService.updateStatus(id, status, actor);
  }

  @Delete(':id')
  @Permissions(PlatformPermission.ORGS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete organization' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @Param('id', LenientUUIDPipe) id: string,
    @CurrentActor() actor: IActorSnapshot,
  ): Promise<void> {
    return this.opsService.deleteOrganization(id, actor);
  }
}
