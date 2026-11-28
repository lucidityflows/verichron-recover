import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RbacOpsService } from './rbac.ops.service';
import { 
  PaginatedRolesResponseDto, 
  ListRolesQueryDto, 
  PaginatedPermissionsResponseDto,
  ListPermissionsQueryDto,
  RoleResponseDto
} from './dto';
import { 
  JwtAuthGuard, 
  PermissionsGuard, 
  Permissions, 
  SkipOrgContext 
} from '../core';
import { PlatformPermission } from '@verichron/enums';

@ApiTags('Ops: RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext()
@Controller('ops/users/rbac')
export class RbacOpsController {
  constructor(private readonly opsService: RbacOpsService) {}

  @Get('roles')
  @Permissions(PlatformPermission.ROLES_MANAGE)
  @ApiOperation({ summary: 'List all roles across the platform' })
  @ApiResponse({ status: 200, type: PaginatedRolesResponseDto })
  async findAllRoles(@Query() query: ListRolesQueryDto) {
    return this.opsService.findAllRoles(query);
  }

  @Post('roles/platform')
  @Permissions(PlatformPermission.ROLES_MANAGE)
  @ApiOperation({ summary: 'Create a new platform-level role' })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  async createPlatformRole(
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('permissionCodes') permissionCodes?: string[]
  ) {
    return this.opsService.createPlatformRole(name, description, permissionCodes);
  }

  @Get('permissions')
  @Permissions(PlatformPermission.ROLES_MANAGE)
  @ApiOperation({ summary: 'List all platform permissions' })
  @ApiResponse({ status: 200, type: PaginatedPermissionsResponseDto })
  async findAllPermissions(@Query() query: ListPermissionsQueryDto) {
    return this.opsService.findAllPermissions(query);
  }
}