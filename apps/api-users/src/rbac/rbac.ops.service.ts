import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { RoleEntity, PermissionEntity, RolePermissionEntity } from './entities';
import { 
  RoleResponseDto, 
  ListRolesQueryDto, 
  PaginatedRolesResponseDto,
  PaginatedPermissionsResponseDto,
  ListPermissionsQueryDto,
  PermissionResponseDto
} from './dto';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { RoleCreatedDto } from '../events/event-dto';
import { PlatformRole } from '@verichron/enums';

/**
 * Ops Service for RBAC Management
 *
 * Exclusively for Platform Admins.
 * Handles system-wide role definitions and platform-level permissions.
 * STRICTLY SEPARATED from tenant-facing RbacService.
 */
@Injectable()
export class RbacOpsService {
  private readonly logger = new Logger(RbacOpsService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,

    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Create a platform role (system-wide, no organization)
   */
  async createPlatformRole(
    name: string,
    description?: string,
    permissionCodes?: string[]
  ): Promise<RoleResponseDto> {
    this.logger.log(`Creating platform role: ${name}`);

    if (!Object.values(PlatformRole).includes(name as PlatformRole)) {
      throw new BadRequestException(`Invalid platform role name: ${name}`);
    }

    const existing = await this.roleRepository.findOne({
      where: { name, organizationId: IsNull() },
    });

    if (existing) {
      return this.mapToRoleResponseDto(existing, 0);
    }

    const role = this.roleRepository.create({
      name,
      description,
      organizationId: null,
      isSystemRole: true,
    });

    const savedRole = await this.roleRepository.save(role);

    if (permissionCodes && permissionCodes.length > 0) {
      const permissions = await this.permissionRepository.find({
        where: { code: In(permissionCodes) },
      });

      const assignments = permissions.map(p => ({
        roleId: savedRole.id,
        permissionId: p.id,
      }));

      await this.rolePermissionRepository.insert(assignments);
    }

    this.logger.log(`Created platform role: ${savedRole.id}`);
    
    // Publish event
    await this.eventPublisher.publish(
      EVENT_TYPES.USERS_ROLE_CREATED,
      {
        roleId: savedRole.id,
        organizationId: null, // Valid now that DTO/Interface allow null
        roleName: savedRole.name,
        isSystemRole: true,
        createdBy: 'PLATFORM_ADMIN',
      },
      RoleCreatedDto
    );

    return this.mapToRoleResponseDto(savedRole, 0);
  }

  /**
   * List all roles across all organizations
   */
  async findAllRoles(query: ListRolesQueryDto): Promise<PaginatedRolesResponseDto> {
    const { page = 1, pageSize = 20, search, isSystemRole } = query;

    const queryBuilder = this.roleRepository.createQueryBuilder('role');

    if (search) {
      queryBuilder.andWhere('role.name ILIKE :search', { search: `%${search}%` });
    }

    if (isSystemRole !== undefined) {
      queryBuilder.andWhere('role.isSystemRole = :isSystemRole', { isSystemRole });
    }

    const total = await queryBuilder.getCount();
    const skip = (page - 1) * pageSize;

    queryBuilder
      .orderBy('role.organizationId', 'ASC', 'NULLS FIRST')
      .addOrderBy('role.name', 'ASC')
      .skip(skip)
      .take(pageSize);

    const roles = await queryBuilder.getMany();

    return {
      data: roles.map(r => this.mapToRoleResponseDto(r, 0)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * List all permissions in the system
   */
  async findAllPermissions(query: ListPermissionsQueryDto): Promise<PaginatedPermissionsResponseDto> {
    const { page = 1, pageSize = 50, resource, search } = query;

    const queryBuilder = this.permissionRepository.createQueryBuilder('permission');

    if (resource) {
      queryBuilder.andWhere('permission.resource = :resource', { resource });
    }

    if (search) {
      queryBuilder.andWhere(
        '(permission.code ILIKE :search OR permission.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const skip = (page - 1) * pageSize;

    queryBuilder
      .orderBy('permission.resource', 'ASC')
      .addOrderBy('permission.action', 'ASC')
      .skip(skip)
      .take(pageSize);

    const permissions = await queryBuilder.getMany();

    return {
      data: permissions.map(p => this.mapToPermissionResponseDto(p)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
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