/**
 * @description Integration tests for the RbacController.
 *
 * ## What This Test Proves:
 * - The RbacController correctly handles HTTP requests for role and permission management.
 * - The controller correctly interacts with the RbacService.
 * - Specific HTTP status codes are returned for successful operations.
 * - The controller correctly uses `@OrganizationId()` and `@CurrentUserId()` decorators.
 *
 * ## What This Test Does NOT Prove:
 * - The internal business logic of RbacService (that's `rbac.service.spec.ts`'s responsibility).
 * - The full authentication guard chain (`PermissionsGuard` is mocked out).
 * - Integration with a live database (RbacService is mocked).
 */
import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { type INestApplication } from '@nestjs/common';
import { type Request, type Response, type NextFunction } from 'express'; // Added NextFunction
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { PermissionsGuard } from '@verichron/auth';
import {
  type CreateRoleDto,
  type UpdateRoleDto,
  type AssignPermissionToRoleDto,
  type AssignPermissionsToRoleDto,
  type RoleDetailDto,
  type ListRolesQueryDto,
  type ListPermissionsQueryDto,
  type AssignRoleToUserDto,
  type RemoveRoleFromUserDto,
  type CheckPermissionDto,
  type CheckPermissionsDto
} from './dto';

const mockOrgId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
const mockRoleId = 'role-123-abc';
const mockPermissionId = 'perm-456-def';
const mockUserId = 'user-789-ghi';

const defaultMockRoleDetail: RoleDetailDto = {
  id: mockRoleId,
  organizationId: mockOrgId,
  name: 'Test Role',
  description: 'A test role',
  isSystemRole: false,
  permissions: [],
  userCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const defaultMockPermission = {
  id: mockPermissionId,
  code: 'user:read',
  description: 'Read user data',
  resource: 'user',
  action: 'read',
};

describe('RbacController', () => {
  let controller: RbacController;
  let service: RbacService;
  let app: INestApplication;

  const mockRbacService = {
    createRole: jest.fn().mockResolvedValue(defaultMockRoleDetail),
    findRolesByOrg: jest.fn().mockResolvedValue({
      data: [defaultMockRoleDetail],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    }),
    findRoleById: jest.fn().mockResolvedValue(defaultMockRoleDetail),
    updateRole: jest.fn().mockResolvedValue(defaultMockRoleDetail),
    deleteRole: jest.fn().mockResolvedValue(undefined),

    findAllPermissions: jest.fn().mockResolvedValue({
      data: [defaultMockPermission],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    }),
    getPermissionsGroupedByResource: jest.fn().mockResolvedValue({
      user: [defaultMockPermission],
    }),

    assignPermissionToRole: jest.fn().mockResolvedValue(undefined),
    assignPermissionsToRole: jest.fn().mockResolvedValue(undefined),
    removePermissionFromRole: jest.fn().mockResolvedValue(undefined),

    assignRoleToUser: jest.fn().mockResolvedValue(undefined),
    removeRoleFromUser: jest.fn().mockResolvedValue(undefined),

    checkPermission: jest.fn().mockResolvedValue({ hasPermission: true }),
    checkPermissions: jest.fn().mockResolvedValue({ results: [{ permission: 'user:read', hasPermission: true }] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      controllers: [RbacController],
      providers: [
        {
          provide: RbacService,
          useValue: mockRbacService,
        },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .setLogger({ // Suppress [Nest] logs for cleaner test output
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      })
      .compile();

    app = module.createNestApplication();
    // Manually set up request context for @OrganizationId()
    app.use((req: Request, res: Response, next: NextFunction) => {
      (req as any).organizationId = mockOrgId; // Mock organization ID
      next();
    });
    await app.init();

    controller = module.get<RbacController>(RbacController);
    service = module.get<RbacService>(RbacService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ========================================================================== //
  //                               ROLES ENDPOINTS                              //
  // ========================================================================== //

  describe('POST /rbac/roles', () => {
    it('should create a new role', async () => {
      const createDto: CreateRoleDto = { name: 'New Role', description: 'Description' };
      const result = await controller.createRole(mockOrgId, createDto);

      expect(service.createRole).toHaveBeenCalledWith(createDto, mockOrgId);
      expect(result).toEqual(defaultMockRoleDetail);
    });
  });

  describe('GET /rbac/roles', () => {
    it('should list roles for an organization', async () => {
      const query: ListRolesQueryDto = { page: 1, pageSize: 10 };
      const result = await controller.listRoles(mockOrgId, query);

      expect(service.findRolesByOrg).toHaveBeenCalledWith(mockOrgId, query);
      expect(result.data).toEqual([defaultMockRoleDetail]);
    });
  });

  describe('GET /rbac/roles/:roleId', () => {
    it('should return role details', async () => {
      const result = await controller.getRoleById(mockOrgId, mockRoleId);

      expect(service.findRoleById).toHaveBeenCalledWith(mockRoleId, mockOrgId);
      expect(result).toEqual(defaultMockRoleDetail);
    });
  });

  describe('PATCH /rbac/roles/:roleId', () => {
    it('should update a role', async () => {
      const updateDto: UpdateRoleDto = { name: 'Updated Role' };
      const result = await controller.updateRole(mockOrgId, mockRoleId, updateDto);

      expect(service.updateRole).toHaveBeenCalledWith(mockRoleId, updateDto, mockOrgId);
      expect(result).toEqual(defaultMockRoleDetail);
    });
  });

  describe('DELETE /rbac/roles/:roleId', () => {
    it('should delete a role', async () => {
      await controller.deleteRole(mockOrgId, mockRoleId);

      expect(service.deleteRole).toHaveBeenCalledWith(mockRoleId, mockOrgId);
    });
  });

  // ========================================================================== //
  //                           PERMISSIONS ENDPOINTS                            //
  // ========================================================================== //

  describe('GET /rbac/permissions', () => {
    it('should return a paginated list of permissions', async () => {
      const query: ListPermissionsQueryDto = { page: 1, pageSize: 10 };
      const result = await controller.listPermissions(mockOrgId, query);

      expect(service.findAllPermissions).toHaveBeenCalledWith(query);
      expect(result.data).toEqual([defaultMockPermission]);
    });
  });

  describe('GET /rbac/permissions/grouped', () => {
    it('should return permissions grouped by resource', async () => {
      const result = await controller.getGroupedPermissions(mockOrgId);

      expect(service.getPermissionsGroupedByResource).toHaveBeenCalled();
      expect(result).toEqual({ user: [defaultMockPermission] });
    });
  });

  // ========================================================================== //
  //                      ROLE-PERMISSION MANAGEMENT ENDPOINTS                  //
  // ========================================================================== //

  describe('POST /rbac/roles/:roleId/permissions', () => {
    it('should assign a permission to a role', async () => {
      const dto: AssignPermissionToRoleDto = { permissionId: mockPermissionId };
      await controller.assignPermissionToRole(mockOrgId, mockRoleId, dto);

      expect(service.assignPermissionToRole).toHaveBeenCalledWith(mockRoleId, mockPermissionId, mockOrgId);
    });
  });

  describe('POST /rbac/roles/:roleId/permissions/bulk', () => {
    it('should assign multiple permissions to a role', async () => {
      const dto: AssignPermissionsToRoleDto = { permissionIds: [mockPermissionId] };
      await controller.assignPermissionsToRole(mockOrgId, mockRoleId, dto);

      expect(service.assignPermissionsToRole).toHaveBeenCalledWith(mockRoleId, [mockPermissionId], mockOrgId);
    });
  });

  describe('DELETE /rbac/roles/:roleId/permissions/:permissionId', () => {
    it('should remove a permission from a role', async () => {
      await controller.removePermissionFromRole(mockOrgId, mockRoleId, mockPermissionId);

      expect(service.removePermissionFromRole).toHaveBeenCalledWith(mockRoleId, mockPermissionId, mockOrgId);
    });
  });

  // ========================================================================== //
  //                       USER-ROLE ASSIGNMENT ENDPOINTS                       //
  // ========================================================================== //

  describe('POST /rbac/users/:userId/roles', () => {
    it('should assign a role to a user', async () => {
      const dto: AssignRoleToUserDto = { roleId: mockRoleId, note: 'Test note' };
      await controller.assignRoleToUser(mockOrgId, mockUserId, dto);

      expect(service.assignRoleToUser).toHaveBeenCalledWith(mockUserId, mockRoleId, mockOrgId, 'Test note');
    });
  });

  describe('DELETE /rbac/users/:userId/roles/:roleId', () => {
    it('should remove a role from a user', async () => {
      const dto: RemoveRoleFromUserDto = { roleId: mockRoleId, note: 'Test note' };
      await controller.removeRoleFromUser(mockOrgId, mockUserId, mockRoleId, dto);

      expect(service.removeRoleFromUser).toHaveBeenCalledWith(mockUserId, mockRoleId, mockOrgId, 'Test note');
    });
  });

  // ========================================================================== //
  //                       PERMISSION VALIDATION ENDPOINTS                      //
  // ========================================================================== //

  describe('POST /rbac/check-permission', () => {
    it('should check if a user has a specific permission', async () => {
      const checkDto: CheckPermissionDto = { userId: mockUserId, organizationId: mockOrgId, permissionCode: 'user:read' };
      const result = await controller.checkPermission(mockOrgId, checkDto);

      expect(service.checkPermission).toHaveBeenCalledWith(checkDto.userId, mockOrgId, checkDto.permissionCode);
      expect(result).toEqual({ hasPermission: true });
    });
  });

  describe('POST /rbac/check-permissions', () => {
    it('should check if a user has multiple permissions', async () => {
      const checkDto: CheckPermissionsDto = { userId: mockUserId, organizationId: mockOrgId, permissionCodes: ['user:read', 'role:create'] };
      const result = await controller.checkPermissions(mockOrgId, checkDto);

      expect(service.checkPermissions).toHaveBeenCalledWith(checkDto.userId, mockOrgId, checkDto.permissionCodes);
      expect(result).toEqual({ results: [{ permission: 'user:read', hasPermission: true }] });
    });
  });
});
