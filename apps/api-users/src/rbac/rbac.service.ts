// src/rbac/rbac.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, DataSource, Not } from 'typeorm';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleResponseDto,
  RoleDetailDto,
  ListRolesQueryDto,
  PaginatedRolesResponseDto,
  PermissionResponseDto,
  ListPermissionsQueryDto,
  PaginatedPermissionsResponseDto,
  GroupedPermissionsResponseDto,
  PermissionsByResourceDto,
  PermissionCheckResultDto,
  PermissionsCheckResultDto
} from './dto';
import { RoleEntity, PermissionEntity, RolePermissionEntity } from './entities';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { 
  RoleCreatedDto, 
  RoleUpdatedDto, 
  RoleDeletedDto, 
  RoleAssignedDto, 
  PermissionsChangedDto 
} from '../events/event-dto';
import {
  PlatformRole
} from '@verichron/enums';
import { 
  RoleNotFoundException,
  PermissionNotFoundException,
  SystemRoleDeletionForbiddenException,
  RoleNameAlreadyExistsException,
  CannotRemoveLastAdminException,
} from './errors';
import { UserMembershipEntity } from '../profiles/entities/index';

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
    
    @InjectRepository(UserMembershipEntity)
    private readonly membershipRepository: Repository<UserMembershipEntity>,

    private readonly dataSource: DataSource,
    private readonly eventPublisher: EventPublisher,
  ) {}

  // ==================== PLATFORM ADMIN HELPERS ====================

  /**
   * Create a platform role (no organization)
   */
  async createPlatformRole(
    name: string,
    description?: string,
    permissionCodes?: string[]
  ): Promise<RoleEntity> {
    this.logger.log(`Creating platform role: ${name}`);

    // Validate it's a platform role name
    if (!Object.values(PlatformRole).includes(name as PlatformRole)) {
      throw new BadRequestException(`Invalid platform role name: ${name}`);
    }

    // Check if already exists
    const existing = await this.roleRepository.findOne({
      where: { 
        name,
        organizationId: IsNull(),
      },
    });

    if (existing) {
      this.logger.log(`Platform role ${name} already exists`);
      return existing;
    }

    // Create role
    const role = this.roleRepository.create({
      name,
      description,
      organizationId: null,
      isSystemRole: true,
    });

    const savedRole = await this.roleRepository.save(role);

    // Assign permissions if provided
    if (permissionCodes && permissionCodes.length > 0) {
      const permissions = await this.permissionRepository.find({
        where: { code: In(permissionCodes) },
      });

      await this.assignPermissionsToRoleInternal(
        savedRole.id,
        permissions.map(p => p.id),
        null, // Platform role has no org
        this.dataSource.manager,
      );
    }

    this.logger.log(`Created platform role: ${savedRole.id}`);
    return savedRole;
  }

  /**
   * Find all platform roles
   */
  async findPlatformRoles(): Promise<RoleEntity[]> {
    return this.roleRepository.find({
      where: { 
        organizationId: IsNull(),
        isSystemRole: true,
      },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Check if user has platform role
   */
  async isPlatformAdmin(userId: string): Promise<boolean> {
    const membership = await this.membershipRepository.findOne({
      where: {
        userId,
        organizationId: IsNull(),
      },
      relations: ['role'],
    });

    return membership?.role?.name === PlatformRole.PLATFORM_ADMIN;
  }

  /**
   * Get user's permissions (platform or org-scoped)
   */
  async getUserPermissions(
    userId: string,
    organizationId: string | null
  ): Promise<string[]> {
    let membership;

    if (organizationId === null) {
      // Get platform membership (NULL org)
      membership = await this.membershipRepository.findOne({
        where: { 
          userId, 
          organizationId: IsNull(),
        },
        relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
      });
    } else {
      // Get org-specific membership
      membership = await this.membershipRepository.findOne({
        where: { userId, organizationId },
        relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
      });
    }

    if (!membership) {
      return [];
    }

    return membership.role.rolePermissions.map(rp => rp.permission.code);
  }

  // ==================== ROLES ====================

  /**
   * Create a new custom role within an organization
   * Platform admins cannot create roles (they don't belong to an org)
   */
  async createRole(
    dto: CreateRoleDto,
    organizationId: string,
  ): Promise<RoleDetailDto> {
    this.logger.log(`Creating role "${dto.name}" for org: ${organizationId}`);

    // Check if role name already exists in this org
    const existingRole = await this.roleRepository.findOne({
      where: { 
        name: dto.name, 
        organizationId,
      },
    });

    if (existingRole) {
      throw new RoleNameAlreadyExistsException(dto.name);
    }

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create the role
      const role = this.roleRepository.create({
        name: dto.name,
        description: dto.description,
        organizationId,
        isSystemRole: false,
      });

      const savedRole = await queryRunner.manager.save(role);

      // Assign permissions if provided
      if (dto.permissionIds && dto.permissionIds.length > 0) {
        await this.assignPermissionsToRoleInternal(
          savedRole.id,
          dto.permissionIds,
          organizationId,
          queryRunner.manager,
        );
      }

      await queryRunner.commitTransaction();

      // Publish event
      await this.eventPublisher.publish(
        EVENT_TYPES.USERS_ROLE_CREATED,
        {
          roleId: savedRole.id,
          organizationId,
          roleName: savedRole.name,
          isSystemRole: false,
          permissionIds: dto.permissionIds,
          createdBy: undefined,
        },
        RoleCreatedDto,
      );

      this.logger.log(`Successfully created role: ${savedRole.id}`);

      return this.findRoleById(savedRole.id, organizationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create role: ${message}`, stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Find all roles with pagination and filtering
   * Platform admins can see all roles across all orgs
   * Org users see only their org's roles
   */
  async findRolesByOrg(
    organizationId: string | null,
    query: ListRolesQueryDto,
  ): Promise<PaginatedRolesResponseDto> {
    const { page = 1, pageSize = 20, search, isSystemRole, permissionId } = query;

    const queryBuilder = this.roleRepository.createQueryBuilder('role');

    // Platform admin: see all roles
    // Org user: filter by organizationId
    if (organizationId !== null) {
      queryBuilder.where('role.organizationId = :organizationId', { organizationId });
    }

    // Apply search filter
    if (search) {
      queryBuilder.andWhere('role.name ILIKE :search', { search: `%${search}%` });
    }

    // Filter by system role status
    if (isSystemRole !== undefined) {
      queryBuilder.andWhere('role.isSystemRole = :isSystemRole', { isSystemRole });
    }

    // Filter by permission
    if (permissionId) {
      queryBuilder
        .innerJoin('role.rolePermissions', 'rp')
        .andWhere('rp.permissionId = :permissionId', { permissionId });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Order by system roles first, then by name
    queryBuilder.orderBy('role.isSystemRole', 'DESC').addOrderBy('role.name', 'ASC');

    const roles = await queryBuilder.getMany();

    // Get user counts for each role (from memberships)
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const userCount = await this.getUserCountForRole(role.id);
        return this.mapToRoleResponseDto(role, userCount);
      }),
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: rolesWithCounts,
      total,
      page,
      pageSize: pageSize,
      totalPages,
    };
  }

  /**
   * Find a single role by ID with full details including permissions
   * Platform admins can access any role
   * Org users can only access roles in their organization
   */
  async findRoleById(
    roleId: string,
    organizationId: string | null,
  ): Promise<RoleDetailDto> {
    const whereClause: any = { id: roleId };
    
    // Org user: must match organizationId
    if (organizationId !== null) {
      whereClause.organizationId = organizationId;
    }
    // Platform admin: no org filter (can see any role)

    const role = await this.roleRepository.findOne({
      where: whereClause,
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!role) {
      throw new RoleNotFoundException(roleId);
    }

    const userCount = await this.getUserCountForRole(roleId);

    const permissions = role.rolePermissions.map((rp) =>
      this.mapToPermissionResponseDto(rp.permission),
    );

    return {
      ...this.mapToRoleResponseDto(role, userCount),
      permissions,
    };
  }

  /**
   * Update a role's name and/or description
   * Platform admins can update any role
   * Org users can only update roles in their organization
   */
  async updateRole(
    roleId: string,
    dto: UpdateRoleDto,
    organizationId: string | null,
  ): Promise<RoleDetailDto> {
    this.logger.log(`Updating role: ${roleId}`);

    const whereClause: any = { id: roleId };
    
    if (organizationId !== null) {
      whereClause.organizationId = organizationId;
    }

    const role = await this.roleRepository.findOne({
      where: whereClause,
    });

    if (!role) {
      throw new RoleNotFoundException(roleId);
    }

    // Check for name conflict if name is being changed
    if (dto.name && dto.name !== role.name) {
      const conflictWhere: any = { name: dto.name };
      
      // Check for conflicts only within the same org scope
      if (role.organizationId === null) {
        conflictWhere.organizationId = IsNull();
      } else {
        conflictWhere.organizationId = role.organizationId;
      }

      const existingRole = await this.roleRepository.findOne({
        where: conflictWhere,
      });

      if (existingRole) {
        throw new RoleNameAlreadyExistsException(dto.name);
      }
    }

    const updatedFields: string[] = [];

    if (dto.name) {
      role.name = dto.name;
      updatedFields.push('name');
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
      updatedFields.push('description');
    }

    await this.roleRepository.save(role);

    // Publish event (only for org roles, not platform roles)
    if (role.organizationId !== null) {
      await this.eventPublisher.publish(
        EVENT_TYPES.USERS_ROLE_UPDATED,
        {
          roleId,
          organizationId: role.organizationId,
          updatedFields,
          updatedAt: new Date().toISOString(),
          updatedBy: undefined,
        },
        RoleUpdatedDto,
      );
    }

    this.logger.log(`Successfully updated role: ${roleId}`);

    return this.findRoleById(roleId, organizationId);
  }

  /**
   * Delete a custom role (system roles cannot be deleted)
   * Platform admins can delete any non-system role
   * Org users can only delete roles in their organization
   */
  async deleteRole(
    roleId: string,
    organizationId: string | null,
  ): Promise<void> {
    this.logger.log(`Deleting role: ${roleId}`);

    const whereClause: any = { id: roleId };
    
    if (organizationId !== null) {
      whereClause.organizationId = organizationId;
    }

    const role = await this.roleRepository.findOne({
      where: whereClause,
    });

    if (!role) {
      throw new RoleNotFoundException(roleId);
    }

    // Cannot delete system roles
    if (role.isSystemRole) {
      throw new SystemRoleDeletionForbiddenException(role.name);
    }

    // Check if any users are assigned to this role
    const userCount = await this.getUserCountForRole(roleId);
    if (userCount > 0) {
      throw new ConflictException(
        `Cannot delete role "${role.name}" while ${userCount} user(s) are assigned to it. Please reassign users first.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete role-permission associations
      await queryRunner.manager.delete(RolePermissionEntity, { roleId });

      // Delete the role
      await queryRunner.manager.delete(RoleEntity, { id: roleId });

      await queryRunner.commitTransaction();

      // Publish event (only for org roles)
      if (role.organizationId !== null) {
        await this.eventPublisher.publish(
          EVENT_TYPES.USERS_ROLE_DELETED,
          {
            roleId,
            organizationId: role.organizationId,
            roleName: role.name,
            deletedAt: new Date().toISOString(),
            deletedBy: undefined,
          },
          RoleDeletedDto,
        );
      }

      this.logger.log(`Successfully deleted role: ${roleId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to delete role: ${message}`, stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== PERMISSIONS ====================

  /**
   * Find all platform permissions with pagination and filtering
   * Platform permissions are available to all users
   */
  async findAllPermissions(
    query: ListPermissionsQueryDto,
  ): Promise<PaginatedPermissionsResponseDto> {
    const { page = 1, pageSize = 50, resource, action, search } = query;

    const queryBuilder = this.permissionRepository.createQueryBuilder('permission');

    // Apply filters
    if (resource) {
      queryBuilder.andWhere('permission.resource = :resource', { resource });
    }

    if (action) {
      queryBuilder.andWhere('permission.action = :action', { action });
    }

    if (search) {
      queryBuilder.andWhere(
        '(permission.code ILIKE :search OR permission.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Order by resource, then action
    queryBuilder
      .orderBy('permission.resource', 'ASC')
      .addOrderBy('permission.action', 'ASC');

    const permissions = await queryBuilder.getMany();

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: permissions.map((p) => this.mapToPermissionResponseDto(p)),
      total,
      page,
      pageSize: pageSize,
      totalPages,
    };
  }

  /**
   * Get permissions grouped by resource for UI rendering
   */
  async getPermissionsGroupedByResource(): Promise<GroupedPermissionsResponseDto> {
    const allPermissions = await this.permissionRepository.find({
      order: {
        resource: 'ASC',
        action: 'ASC',
      },
    });

    // Group by resource
    const groupedMap = new Map<string, PermissionResponseDto[]>();

    allPermissions.forEach((permission) => {
      const resource = permission.resource;
      if (!groupedMap.has(resource)) {
        groupedMap.set(resource, []);
      }
      groupedMap.get(resource)!.push(this.mapToPermissionResponseDto(permission));
    });

    // Convert to array
    const groups: PermissionsByResourceDto[] = Array.from(groupedMap.entries()).map(
      ([resource, permissions]) => ({
        resource,
        permissions,
      }),
    );

    return { groups };
  }

  // ==================== ROLE-PERMISSION MANAGEMENT ====================

  /**
   * Assign a single permission to a role
   */
  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
    organizationId: string | null,
  ): Promise<void> {
    return this.assignPermissionsToRole(roleId, [permissionId], organizationId);
  }

  /**
   * Assign multiple permissions to a role
   * Platform admins can modify any role
   * Org users can only modify roles in their organization
   */
  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[],
    organizationId: string | null,
  ): Promise<void> {
    this.logger.log(`Assigning ${permissionIds.length} permission(s) to role: ${roleId}`);

    const whereClause: any = { id: roleId };
    
    if (organizationId !== null) {
      whereClause.organizationId = organizationId;
    }

    const role = await this.roleRepository.findOne({
      where: whereClause,
    });

    if (!role) {
      throw new RoleNotFoundException(roleId);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.assignPermissionsToRoleInternal(
        roleId,
        permissionIds,
        organizationId,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      // Get permission codes for event
      const permissions = await this.permissionRepository.find({
        where: { id: In(permissionIds) },
      });

      const permissionCodes = permissions.map((p) => p.code);

      // Publish event (only for org roles)
      if (role.organizationId !== null) {
        await this.eventPublisher.publish(
          EVENT_TYPES.USERS_PERMISSIONS_CHANGED,
          {
            roleId,
            organizationId: role.organizationId,
            addedPermissions: permissionCodes,
            removedPermissions: [],
            changedAt: new Date().toISOString(),
            changedBy: undefined,
          },
          PermissionsChangedDto,
        );
      }

      this.logger.log(`Successfully assigned permissions to role: ${roleId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to assign permissions: ${message}`, stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Internal method to assign permissions (used within transactions)
   */
  private async assignPermissionsToRoleInternal(
    roleId: string,
    permissionIds: string[],
    organizationId: string | null,
    manager: any,
  ): Promise<void> {
    // Validate all permissions exist
    const permissions = await manager.find(PermissionEntity, {
      where: { id: In(permissionIds) },
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = permissions.map((p: PermissionEntity) => p.id);
      const missingIds = permissionIds.filter((id) => !foundIds.includes(id));
      throw new PermissionNotFoundException(missingIds[0]);
    }

    // Get existing assignments
    const existingAssignments = await manager.find(RolePermissionEntity, {
      where: { roleId },
    });

    const existingPermissionIds = new Set(
      existingAssignments.map((rp: RolePermissionEntity) => rp.permissionId),
    );

    // Only create new assignments for permissions not already assigned
    const newAssignments = permissionIds
      .filter((permissionId) => !existingPermissionIds.has(permissionId))
      .map((permissionId) => ({
        roleId,
        permissionId,
      }));

    if (newAssignments.length > 0) {
      await manager.insert(RolePermissionEntity, newAssignments);
    }

    if (newAssignments.length === 0) {
      this.logger.log(`All permissions already assigned to role ${roleId}`);
    }
  }

  /**
   * Remove a permission from a role
   * Platform admins can modify any role
   * Org users can only modify roles in their organization
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
    organizationId: string | null,
  ): Promise<void> {
    this.logger.log(`Removing permission ${permissionId} from role: ${roleId}`);

    const whereClause: any = { id: roleId };
    
    if (organizationId !== null) {
      whereClause.organizationId = organizationId;
    }

    const role = await this.roleRepository.findOne({
      where: whereClause,
    });

    if (!role) {
      throw new RoleNotFoundException(roleId);
    }

    const permission = await this.permissionRepository.findOne({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new PermissionNotFoundException(permissionId);
    }

    const deleted = await this.rolePermissionRepository.delete({
      roleId,
      permissionId,
    });

    if (deleted.affected === 0) {
      this.logger.warn(`Permission ${permissionId} was not assigned to role ${roleId}`);
    }

    // Publish event (only for org roles)
    if (role.organizationId !== null) {
      await this.eventPublisher.publish(
        EVENT_TYPES.USERS_PERMISSIONS_CHANGED,
        {
          roleId,
          organizationId: role.organizationId,
          addedPermissions: [],
          removedPermissions: [permission.code],
          changedAt: new Date().toISOString(),
          changedBy: undefined,
        },
        PermissionsChangedDto,
      );
    }

    this.logger.log(`Successfully removed permission from role: ${roleId}`);
  }

  // ==================== USER-ROLE ASSIGNMENT ====================

  /**
   * Assign a role to a user
   * Platform admins can assign roles to any user
   * Org users can only assign roles within their organization
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    organizationId: string | null,
    note?: string,
  ): Promise<void> {
    this.logger.log(`Assigning role ${roleId} to user ${userId}`);

    const whereClause: any = { id: roleId };
    
    if (organizationId !== null) {
      whereClause.organizationId = organizationId;
    }

    const role = await this.roleRepository.findOne({
      where: whereClause,
    });

    if (!role) {
      throw new RoleNotFoundException(roleId);
    }

    // Find the membership
    const membershipWhere: any = { userId };
    
    if (role.organizationId === null) {
      // Platform role assignment
      membershipWhere.organizationId = IsNull();
    } else {
      // Org role assignment
      membershipWhere.organizationId = role.organizationId;
    }

    const membership = await this.membershipRepository.findOne({
      where: membershipWhere,
    });

    if (!membership) {
      throw new NotFoundException(
        `User ${userId} is not a member of ${role.organizationId === null ? 'platform' : `organization ${role.organizationId}`}`,
      );
    }

    // Update the role
    membership.roleId = roleId;
    await this.membershipRepository.save(membership);

    // Publish event (only for org roles)
    if (role.organizationId !== null) {
      await this.eventPublisher.publish(
        EVENT_TYPES.USERS_ROLE_ASSIGNED,
        {
          userId,
          roleId,
          organizationId: role.organizationId,
          roleName: role.name,
          note,
          assignedAt: new Date().toISOString(),
          assignedBy: undefined,
        },
        RoleAssignedDto,
      );
    }

    this.logger.log(`Successfully assigned role to user: ${userId}`);
  }

  /**
   * Remove a role from a user (not recommended - use assignRoleToUser instead)
   */
  async removeRoleFromUser(
    userId: string,
    roleId: string,
    organizationId: string | null,
    note?: string,
  ): Promise<void> {
    this.logger.log(`Removing role ${roleId} from user ${userId}`);

    const whereClause: any = { id: roleId };
    
    if (organizationId !== null) {
      whereClause.organizationId = organizationId;
    }

    const role = await this.roleRepository.findOne({
      where: whereClause,
    });

    if (!role) {
      throw new RoleNotFoundException(roleId);
    }

    const membershipWhere: any = { userId, roleId };
    
    if (role.organizationId === null) {
      membershipWhere.organizationId = IsNull();
    } else {
      membershipWhere.organizationId = role.organizationId;
    }

    const membership = await this.membershipRepository.findOne({
      where: membershipWhere,
    });

    if (!membership) {
      throw new NotFoundException(
        `User ${userId} does not have role ${roleId}`,
      );
    }

    // Prevent removing the last admin role (only for org admins)
    if (role.organizationId !== null && role.name === 'ORGANIZATION_ADMIN') {
      const adminCount = await this.countAdminsInOrganization(role.organizationId);
      if (adminCount <= 1) {
        throw new CannotRemoveLastAdminException();
      }
    }

    // Cannot remove role - must assign a different one
    throw new BadRequestException(
      'Cannot remove role from user. Assign a different role instead using the assignRoleToUser endpoint.',
    );
  }

  // ==================== PERMISSION VALIDATION ====================

  /**
   * Check if a user has a specific permission
   */
  async checkPermission(
    userId: string,
    organizationId: string | null,
    permissionCode: string,
  ): Promise<PermissionCheckResultDto> {
    this.logger.debug(`Checking permission ${permissionCode} for user ${userId}`);

    const permissions = await this.getUserPermissions(userId, organizationId);
    const hasPermission = permissions.includes(permissionCode);

    return {
      permissionCode,
      hasPermission,
    };
  }

  /**
   * Check if a user has multiple permissions
   */
  async checkPermissions(
    userId: string,
    organizationId: string | null,
    permissionCodes: string[],
  ): Promise<PermissionsCheckResultDto> {
    this.logger.debug(
      `Checking ${permissionCodes.length} permissions for user ${userId}`,
    );

    const results = await Promise.all(
      permissionCodes.map((code) =>
        this.checkPermission(userId, organizationId, code),
      ),
    );

    const hasAllPermissions = results.every((r) => r.hasPermission);

    return {
      results,
      hasAllPermissions,
    };
  }

  /**
   * Get permissions for a user in an organization with role name
   * Used by AuthService for ACT token generation
   */
  async getPermissionsForUserInOrganization(
    userId: string,
    organizationId: string | null,
  ): Promise<{ permissions: string[]; role: string | null }> {
    const membershipWhere: any = { userId };
    
    if (organizationId === null) {
      membershipWhere.organizationId = IsNull();
    } else {
      membershipWhere.organizationId = organizationId;
    }

    const membership = await this.membershipRepository.findOne({
      where: membershipWhere,
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
    });

    if (!membership) {
      return { permissions: [], role: null };
    }

    const permissions = membership.role.rolePermissions.map(
      (rp) => rp.permission.code,
    );

    return {
      permissions,
      role: membership.role.name,
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get count of users assigned to a role
   */
  private async getUserCountForRole(roleId: string): Promise<number> {
    return this.membershipRepository.count({ where: { roleId } });
  }

  /**
   * Count admins in an organization
   */
  private async countAdminsInOrganization(organizationId: string): Promise<number> {
    const adminRole = await this.roleRepository.findOne({
      where: { organizationId, name: 'ORGANIZATION_ADMIN' },
    });

    if (!adminRole) return 0;

    return this.membershipRepository.count({ where: { roleId: adminRole.id } });
  }

  /**
   * Find a system role by name
   * Can be used for both platform and org roles
   */
  async findSystemRole(
    organizationId: string | null,
    roleName: string,
  ): Promise<RoleEntity | null> {
    const whereClause: any = {
      name: roleName,
      isSystemRole: true,
    };

    if (organizationId === null) {
      whereClause.organizationId = IsNull();
    } else {
      whereClause.organizationId = organizationId;
    }

    return this.roleRepository.findOne({
      where: whereClause,
    });
  }

  /**
   * Find or create system role (used during org provisioning)
   */
  async findOrCreateSystemRole(
    organizationId: string,
    roleName: string,
  ): Promise<RoleEntity> {
    let role = await this.findSystemRole(organizationId, roleName);

    if (!role) {
      // System roles should be created during seeding
      // But as a fallback, create it if missing
      this.logger.warn(
        `System role "${roleName}" not found for org ${organizationId}, creating...`,
      );

      role = this.roleRepository.create({
        name: roleName,
        description: `System role: ${roleName}`,
        organizationId,
        isSystemRole: true,
      });

      role = await this.roleRepository.save(role);

      // Assign default permissions based on role type
      try {
        if (roleName === 'ORGANIZATION_ADMIN') {
          // Admin gets everything except platform and debtor-self permissions
          const permissions = await this.permissionRepository.find({
            where: {
              resource: Not(In(['platform', 'debtor:self'])),
            },
          });
          
          if (permissions.length > 0) {
            await this.assignPermissionsToRoleInternal(
              role.id,
              permissions.map(p => p.id),
              organizationId,
              this.dataSource.manager,
            );
            this.logger.log(`Assigned ${permissions.length} default permissions to ORGANIZATION_ADMIN`);
          }
        } else if (roleName === 'DEBTOR') {
          // Debtor gets only debtor-self permissions
          const permissions = await this.permissionRepository.find({
            where: {
              resource: 'debtor:self',
            },
          });

          if (permissions.length > 0) {
            await this.assignPermissionsToRoleInternal(
              role.id,
              permissions.map(p => p.id),
              organizationId,
              this.dataSource.manager,
            );
            this.logger.log(`Assigned ${permissions.length} default permissions to DEBTOR`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to assign default permissions to role ${roleName}:`, error);
        // We don't throw here to avoid blocking the auth flow, but this is critical
      }
    }

    return role;
  }

  // ==================== MAPPERS ====================

  private mapToRoleResponseDto(role: RoleEntity, userCount: number): RoleResponseDto {
    return {
      id: role.id,
      organizationId: role.organizationId,
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      userCount,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  private mapToPermissionResponseDto(permission: PermissionEntity): PermissionResponseDto {
    return {
      id: permission.id,
      code: permission.code,
      description: permission.description,
      resource: permission.resource,
      action: permission.action,
      scope: permission.scope,
      createdAt: permission.createdAt,
    };
  }
}