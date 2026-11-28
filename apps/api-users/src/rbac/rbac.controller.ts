import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Get, 
  Param, 
  Patch, 
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionToRoleDto,
  AssignPermissionsToRoleDto,
  RoleDetailDto,
  ListRolesQueryDto,
  PaginatedRolesResponseDto,
  ListPermissionsQueryDto,
  PaginatedPermissionsResponseDto,
  GroupedPermissionsResponseDto,
  AssignRoleToUserDto,
  RemoveRoleFromUserDto,
  CheckPermissionDto,
  CheckPermissionsDto,
  PermissionCheckResultDto,
  PermissionsCheckResultDto
} from './dto';
import { PermissionsGuard, Permissions } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('RBAC')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('users/rbac/orgs/:organizationId')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // ==================== ROLES ====================

  @Post('roles')
  @Permissions(OrganizationPermission.USERS_ROLES_ASSIGN)
  @ApiOperation({ 
    summary: 'Create a new custom role',
    description: 'Creates a new role within the organization with optional permissions. System roles cannot be created via this endpoint.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'The role has been successfully created.', 
    type: RoleDetailDto,
  })
  async createRole(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() createRoleDto: CreateRoleDto,
  ): Promise<RoleDetailDto> {
    return this.rbacService.createRole(createRoleDto, organizationId);
  }

  @Get('roles')
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({ 
    summary: 'List all roles',
    description: 'Returns a paginated list of roles in your organization with optional filtering.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'A paginated list of roles.', 
    type: PaginatedRolesResponseDto,
  })
  async listRoles(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: ListRolesQueryDto,
  ): Promise<PaginatedRolesResponseDto> {
    return this.rbacService.findRolesByOrg(organizationId, query);
  }

  @Get('roles/:roleId')
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({ 
    summary: 'Get role details including permissions',
    description: 'Returns detailed information about a specific role in your organization, including all assigned permissions.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({ 
    name: 'roleId', 
    description: 'The UUID of the role',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'The role details.', 
    type: RoleDetailDto,
  })
  async getRoleById(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<RoleDetailDto> {
    return this.rbacService.findRoleById(roleId, organizationId);
  }

  @Patch('roles/:roleId')
  @Permissions(OrganizationPermission.USERS_ROLES_ASSIGN)
  @ApiOperation({ 
    summary: 'Update a role',
    description: 'Updates the name and/or description of a role in your organization. System roles can be customized but not deleted.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({ 
    name: 'roleId', 
    description: 'The UUID of the role to update',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'The updated role.', 
    type: RoleDetailDto,
  })
  async updateRole(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<RoleDetailDto> {
    return this.rbacService.updateRole(roleId, updateRoleDto, organizationId);
  }

  @Delete('roles/:roleId')
  @Permissions(OrganizationPermission.USERS_ROLES_ASSIGN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete a custom role',
    description: 'Deletes a custom role in your organization. System roles cannot be deleted. Users must be reassigned before deletion.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({ 
    name: 'roleId', 
    description: 'The UUID of the role to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 204, 
    description: 'The role has been successfully deleted.',
  })
  async deleteRole(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<void> {
    return this.rbacService.deleteRole(roleId, organizationId);
  }

  // ==================== PERMISSIONS ====================

  @Get('permissions')
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({ 
    summary: 'List all available platform permissions',
    description: 'Returns a paginated list of all permissions available in the platform. These are platform-wide and cannot be modified.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'A paginated list of permissions.', 
    type: PaginatedPermissionsResponseDto,
  })
  async listPermissions(
    @Param('organizationId') _organizationId: string,
    @Query() query: ListPermissionsQueryDto,
  ): Promise<PaginatedPermissionsResponseDto> {
    return this.rbacService.findAllPermissions(query);
  }

  @Get('permissions/grouped')
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({ 
    summary: 'Get permissions grouped by resource',
    description: 'Returns all permissions organized by resource type for easier UI rendering.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permissions grouped by resource.', 
    type: GroupedPermissionsResponseDto,
  })
  async getGroupedPermissions(
    @Param('organizationId') _organizationId: string,
  ): Promise<GroupedPermissionsResponseDto> {
    return this.rbacService.getPermissionsGroupedByResource();
  }

  // ==================== ROLE-PERMISSION MANAGEMENT ====================

  @Post('roles/:roleId/permissions')
  @Permissions(OrganizationPermission.USERS_ROLES_ASSIGN)
  @ApiOperation({ 
    summary: 'Assign a permission to a role',
    description: 'Assigns a single permission to the specified role in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({ 
    name: 'roleId', 
    description: 'The UUID of the role',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'The permission has been assigned to the role.',
  })
  async assignPermissionToRole(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() assignPermissionDto: AssignPermissionToRoleDto,
  ): Promise<void> {
    return this.rbacService.assignPermissionToRole(
      roleId,
      assignPermissionDto.permissionId,
      organizationId,
    );
  }

  @Post('roles/:roleId/permissions/bulk')
  @Permissions(OrganizationPermission.USERS_ROLES_ASSIGN)
  @ApiOperation({ 
    summary: 'Assign multiple permissions to a role',
    description: 'Assigns multiple permissions to the specified role in your organization in a single operation.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({ 
    name: 'roleId', 
    description: 'The UUID of the role',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'The permissions have been assigned to the role.',
  })
  async assignPermissionsToRole(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() assignPermissionsDto: AssignPermissionsToRoleDto,
  ): Promise<void> {
    return this.rbacService.assignPermissionsToRole(
      roleId,
      assignPermissionsDto.permissionIds,
      organizationId,
    );
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @Permissions(OrganizationPermission.USERS_ROLES_ASSIGN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Remove a permission from a role',
    description: 'Removes the specified permission from the role in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({ 
    name: 'roleId', 
    description: 'The UUID of the role',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({ 
    name: 'permissionId', 
    description: 'The UUID of the permission to remove',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 204, 
    description: 'The permission has been removed from the role.',
  })
  async removePermissionFromRole(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ): Promise<void> {
    return this.rbacService.removePermissionFromRole(
      roleId,
      permissionId,
      organizationId,
    );
  }

  // ==================== USER-ROLE ASSIGNMENT ====================

  @Post('users/:userId/roles')
  @Permissions(OrganizationPermission.USERS_ROLES_ASSIGN)
  @ApiOperation({ 
    summary: 'Assign a role to a user',
    description: 'Assigns the specified role to a user within your organization context.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'The role has been assigned to the user.',
  })
  async assignRoleToUser(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() assignRoleDto: AssignRoleToUserDto,
  ): Promise<void> {
    return this.rbacService.assignRoleToUser(
      userId,
      assignRoleDto.roleId,
      organizationId,
      assignRoleDto.note,
    );
  }

  @Delete('users/:userId/roles/:roleId')
  @Permissions(OrganizationPermission.USERS_ROLES_ASSIGN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Remove a role from a user',
    description: 'Removes the specified role from a user. Note: This endpoint is deprecated. Use assignRoleToUser to change roles instead.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({ 
    name: 'roleId', 
    description: 'The UUID of the role to remove',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 204, 
    description: 'The role has been removed from the user.',
  })
  async removeRoleFromUser(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() removeRoleDto: RemoveRoleFromUserDto,
  ): Promise<void> {
    return this.rbacService.removeRoleFromUser(
      userId,
      roleId,
      organizationId,
      removeRoleDto.note,
    );
  }

  // ==================== PERMISSION VALIDATION ====================

  @Post('check-permission')
  @ApiOperation({ 
    summary: 'Check if a user has a specific permission',
    description: 'Validates whether a user has the specified permission within an organization context (or platform context). Useful for UI feature flags.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permission check result.', 
    type: PermissionCheckResultDto,
  })
  async checkPermission(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() checkPermissionDto: CheckPermissionDto,
  ): Promise<PermissionCheckResultDto> {
    return this.rbacService.checkPermission(
      checkPermissionDto.userId,
      organizationId || checkPermissionDto.organizationId,
      checkPermissionDto.permissionCode,
    );
  }

  @Post('check-permissions')
  @ApiOperation({ 
    summary: 'Check if a user has multiple permissions',
    description: 'Validates whether a user has all of the specified permissions. More efficient than multiple single checks.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Bulk permission check results.', 
    type: PermissionsCheckResultDto,
  })
  async checkPermissions(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() checkPermissionsDto: CheckPermissionsDto,
  ): Promise<PermissionsCheckResultDto> {
    return this.rbacService.checkPermissions(
      checkPermissionsDto.userId,
      organizationId || checkPermissionsDto.organizationId,
      checkPermissionsDto.permissionCodes,
    );
  }
}