import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AutoAssignmentService } from './auto-assignment.service';
import { CreateAutoAssignmentDto } from './dto/create-auto-assignment.dto';
import { UpdateAutoAssignmentDto } from './dto/update-auto-assignment.dto';
import { AutoAssignmentConfigResponseDto } from './dto/auto-assignment-config-response.dto';
import { Permissions, JwtAuthGuard, PermissionsGuard } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Auto Assignment')
@ApiBearerAuth()
@Controller('workflows/auto-assignment/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
export class AutoAssignmentController {
  constructor(private readonly autoAssignmentService: AutoAssignmentService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new auto-assignment configuration' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The auto-assignment configuration has been successfully created.',
    type: AutoAssignmentConfigResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() createAutoAssignmentDto: CreateAutoAssignmentDto,
  ): Promise<AutoAssignmentConfigResponseDto> {
    return this.autoAssignmentService.create(organizationId, createAutoAssignmentDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_VIEW)
  @ApiOperation({ summary: 'Get all auto-assignment configurations for an organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved auto-assignment configurations.',
    type: [AutoAssignmentConfigResponseDto],
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findAll(@Param('organizationId', ParseUUIDPipe) organizationId: string): Promise<AutoAssignmentConfigResponseDto[]> {
    return this.autoAssignmentService.findAll(organizationId);
  }

  @Get(':configId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_VIEW)
  @ApiOperation({ summary: 'Get a specific auto-assignment configuration by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved auto-assignment configuration.',
    type: AutoAssignmentConfigResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('configId', ParseUUIDPipe) configId: string,
  ): Promise<AutoAssignmentConfigResponseDto> {
    const config = await this.autoAssignmentService.findOne(organizationId, configId);
    return new AutoAssignmentConfigResponseDto(config);
  }

  @Patch(':configId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_MANAGE)
  @ApiOperation({ summary: 'Update an existing auto-assignment configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The auto-assignment configuration has been successfully updated.',
    type: AutoAssignmentConfigResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() updateAutoAssignmentDto: UpdateAutoAssignmentDto,
  ): Promise<AutoAssignmentConfigResponseDto> {
    return this.autoAssignmentService.update(organizationId, configId, updateAutoAssignmentDto);
  }

  @Delete(':configId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an auto-assignment configuration' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The auto-assignment configuration has been successfully deleted.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('configId', ParseUUIDPipe) configId: string,
  ): Promise<void> {
    return this.autoAssignmentService.remove(organizationId, configId);
  }

  @Patch(':configId/toggle')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_AUTO_ASSIGNMENT_MANAGE)
  @ApiOperation({ summary: 'Toggle enable/disable status of an auto-assignment configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Auto-assignment configuration status has been successfully toggled.',
    type: AutoAssignmentConfigResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  toggle(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('configId', ParseUUIDPipe) configId: string,
  ): Promise<AutoAssignmentConfigResponseDto> {
    return this.autoAssignmentService.toggle(organizationId, configId);
  }
}
