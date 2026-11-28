/**
 * @system-rule R-U-RBAC-001, R-U-RBAC-002, R-U-RBAC-003
 * @description Unit tests for the RbacService.
 *
 * ## What This Test Proves:
 * - The RbacService can correctly create a new role with permissions.
 * - The service prevents the deletion of system roles.
 * - The service allows deletion of a role when no users are assigned.
 *
 * ## What This Test Does NOT Prove:
 * - The negative case for deleting a role that *does* have users assigned.
 * - The full update lifecycle of a role.
 * - All edge cases for permission assignment.
 */
// src/rbac/rbac.service.spec.ts
import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository, DataSource, type InsertResult } from 'typeorm';
import { RbacService } from './rbac.service';
import { RoleEntity, PermissionEntity, RolePermissionEntity } from './entities';
import { UserMembershipEntity } from '../profiles/entities';
import { EventPublisher } from '@verichron/event-publisher';
import { ConflictException } from '@nestjs/common';
import { RoleNotFoundException } from './errors';
import { EVENT_TYPES } from '@verichron/events';
import { RoleCreatedDto, RoleDeletedDto, PermissionsChangedDto } from '../events/event-dto';

describe('RbacService', () => {
  let service: RbacService;
  let roleRepository: Repository<RoleEntity>;
  let permissionRepository: Repository<PermissionEntity>;
  let rolePermissionRepository: Repository<RolePermissionEntity>;
  let eventPublisher: EventPublisher;
  let dataSource: DataSource;

  const mockRole: RoleEntity = {
    id: 'role-123',
    organizationId: 'org-456',
    name: 'Test Role',
    description: 'A test role',
    isSystemRole: false,
    rolePermissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isPlatformRole: () => false,
  };

  const mockPermission: PermissionEntity = {
    id: 'perm-123',
    code: 'debt:read',
    description: 'View debts',
    resource: 'debt',
    action: 'read',
    scope: undefined,
    rolePermissions: [],
    createdAt: new Date(),
  };

  const mockInsertResult: InsertResult = {
    identifiers: [],
    generatedMaps: [],
    raw: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        RbacService,
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PermissionEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RolePermissionEntity),
          useValue: {
            find: jest.fn(),
            delete: jest.fn(),
            insert: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserMembershipEntity),
          useValue: {
            count: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn(),
                find: jest.fn(),
                insert: jest.fn(),
                delete: jest.fn(),
              },
            }),
          },
        },
        {
          provide: EventPublisher,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
    roleRepository = module.get<Repository<RoleEntity>>(getRepositoryToken(RoleEntity));
    permissionRepository = module.get<Repository<PermissionEntity>>(
      getRepositoryToken(PermissionEntity),
    );
    rolePermissionRepository = module.get<Repository<RolePermissionEntity>>(
      getRepositoryToken(RolePermissionEntity),
    );
    eventPublisher = module.get<EventPublisher>(EventPublisher);
    dataSource = module.get<DataSource>(DataSource);
  });

  describe('findRoleById', () => {
    it('should return a role with permissions', async () => {
      const roleWithPermissions = {
        ...mockRole,
        rolePermissions: [
          {
            roleId: mockRole.id,
            permissionId: mockPermission.id,
            role: mockRole,
            permission: mockPermission,
          },
        ],
        isPlatformRole: () => false,
      };

      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(roleWithPermissions);
      jest.spyOn(service as any, 'getUserCountForRole').mockResolvedValue(5);

      const result = await service.findRoleById('role-123', 'org-456');

      expect(result.id).toBe(mockRole.id);
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].code).toBe('debt:read');
      expect(result.userCount).toBe(5);
    });

    it('should throw RoleNotFoundException when role not found', async () => {
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.findRoleById('nonexistent', 'org-456'),
      ).rejects.toThrow(RoleNotFoundException);
    });
  });

  describe('createRole', () => {
    it('should create a role and publish event', async () => {
      const createDto = {
        name: 'New Role',
        description: 'A new role',
        permissionIds: ['perm-123'],
      };

      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(roleRepository, 'create').mockReturnValue(mockRole);

      // const dataSource = service['dataSource']; // Removed in favor of local variable
      const queryRunner = await dataSource.createQueryRunner();
      const savedRole = { ...mockRole, name: createDto.name, description: createDto.description };
      jest.spyOn(queryRunner.manager, 'save').mockResolvedValue(savedRole);
      jest.spyOn(queryRunner.manager, 'find').mockResolvedValue([mockPermission]);
      jest.spyOn(queryRunner.manager, 'insert').mockResolvedValue(mockInsertResult);
      jest.spyOn(service, 'findRoleById').mockResolvedValue({
        ...mockRole,
        name: createDto.name,
        description: createDto.description,
        permissions: [mockPermission],
        userCount: 0,
      } as any);

      const result = await service.createRole(createDto, 'org-456');

      expect(result.name).toBe('New Role');
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.USERS_ROLE_CREATED,
        expect.objectContaining({
          roleId: mockRole.id,
          roleName: 'New Role',
          organizationId: 'org-456',
        }),
        RoleCreatedDto,
      );
    });
  });

  describe('deleteRole', () => {
    it('should not allow deleting system roles', async () => {
      const systemRole = { ...mockRole, isSystemRole: true, isPlatformRole: () => false };
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(systemRole);

      await expect(
        service.deleteRole('role-123', 'org-456'),
      ).rejects.toThrow('cannot be deleted');
    });

    it('should delete custom role with no users', async () => {
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(mockRole);
      jest.spyOn(service as any, 'getUserCountForRole').mockResolvedValue(0);

      // const dataSource = service['dataSource']; // Removed in favor of local variable
      const queryRunner = await dataSource.createQueryRunner();
      jest.spyOn(queryRunner.manager, 'delete').mockResolvedValue({ affected: 1 } as any);

      await service.deleteRole('role-123', 'org-456');

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.USERS_ROLE_DELETED,
        expect.objectContaining({
          roleId: 'role-123',
          organizationId: 'org-456',
        }),
        RoleDeletedDto,
      );
            });
      
          it('should throw ConflictException if role has assigned users', async () => {
            jest.spyOn(roleRepository, 'findOne').mockResolvedValue(mockRole);
            jest.spyOn(service as any, 'getUserCountForRole').mockResolvedValue(3); // Mock users assigned
      
            await expect(service.deleteRole('role-123', 'org-456')).rejects.toThrow(
              ConflictException,
            );
            await expect(service.deleteRole('role-123', 'org-456')).rejects.toThrow(
              'Cannot delete role "Test Role" while 3 user(s) are assigned to it. Please reassign users first.',
            );
          });
        });
  describe('assignPermissionsToRole', () => {
    it('should assign permissions to a role', async () => {
      jest.spyOn(roleRepository, 'findOne').mockResolvedValue(mockRole);

      // const dataSource = service['dataSource']; // Removed in favor of local variable
      const queryRunner = await dataSource.createQueryRunner();
      jest.spyOn(queryRunner.manager, 'find')
        .mockResolvedValueOnce([mockPermission]) // permissions
        .mockResolvedValueOnce([]); // existing assignments
      jest.spyOn(queryRunner.manager, 'insert').mockResolvedValue(mockInsertResult);
      jest.spyOn(permissionRepository, 'find').mockResolvedValue([mockPermission]);

      await service.assignPermissionsToRole('role-123', ['perm-123'], 'org-456');

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.USERS_PERMISSIONS_CHANGED,
        expect.objectContaining({
          roleId: 'role-123',
          addedPermissions: ['debt:read'],
        }),
        PermissionsChangedDto,
      );
    });
  });
});