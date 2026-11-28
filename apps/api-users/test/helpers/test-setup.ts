import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { UserEntity } from '../../src/profiles/entities/user.entity';
import { RoleEntity } from '../../src/rbac/entities/role.entity';
import { PermissionEntity } from '../../src/rbac/entities/permission.entity';
import { RolePermissionEntity } from '../../src/rbac/entities/role-permission.entity';
import { UserMembershipEntity } from '../../src/profiles/entities/user-membership.entity';
import { UserStatus } from '@verichron/enums';

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
  authService: AuthService;
  repos: {
    user: Repository<UserEntity>;
    role: Repository<RoleEntity>;
    permission: Repository<PermissionEntity>;
    rolePermission: Repository<RolePermissionEntity>;
    membership: Repository<UserMembershipEntity>;
  };
}

export interface TestOrganization {
  organizationId: string;
  organizationName: string;
  adminUser: UserEntity;
  adminRole: RoleEntity;
  adminToken: string;
  regularUser?: UserEntity;
  regularRole?: RoleEntity;
  regularUserToken?: string;
  permissions: PermissionEntity[];
}

export async function createTestApp(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.use(cookieParser());
  await app.init();

  const dataSource = moduleFixture.get<DataSource>(DataSource);
  const authService = moduleFixture.get<AuthService>(AuthService);

  const repos = {
    user: dataSource.getRepository(UserEntity),
    role: dataSource.getRepository(RoleEntity),
    permission: dataSource.getRepository(PermissionEntity),
    rolePermission: dataSource.getRepository(RolePermissionEntity),
    membership: dataSource.getRepository(UserMembershipEntity),
  };

  return { app, dataSource, authService, repos };
}

export async function cleanDatabase(context: TestContext): Promise<void> {
  const { dataSource } = context;

  // Use query runner to delete all data (more reliable than repository.delete({}))
  await dataSource.query('DELETE FROM user_memberships');
  await dataSource.query('DELETE FROM role_permissions');
  await dataSource.query('DELETE FROM users');
  await dataSource.query('DELETE FROM roles');
  await dataSource.query('DELETE FROM permissions');
}

export async function createTestOrganization(
  context: TestContext,
  orgId: string,
  orgName: string,
  includeRegularUser = false,
): Promise<TestOrganization> {
  const { repos, authService } = context;

  // Create permissions
  const permissionsData = [
    { code: 'user:create', description: 'Create users', resource: 'user', action: 'create' },
    { code: 'user:read', description: 'Read users', resource: 'user', action: 'read' },
    { code: 'user:update', description: 'Update users', resource: 'user', action: 'update' },
    { code: 'user:delete', description: 'Delete users', resource: 'user', action: 'delete' },
    { code: 'role:read', description: 'Read roles', resource: 'role', action: 'read' },
    { code: 'role:create', description: 'Create roles', resource: 'role', action: 'create' },
    { code: 'role:update', description: 'Update roles', resource: 'role', action: 'update' },
    { code: 'role:delete', description: 'Delete roles', resource: 'role', action: 'delete' },
    { code: 'role:assign', description: 'Assign roles', resource: 'role', action: 'assign' },
  ];

  const permissions = await repos.permission.save(permissionsData);

  // Create admin role with all permissions
  const adminRole = await repos.role.save({
    name: `Admin-${orgId}`,
    organizationId: orgId,
    isSystemRole: false,
    description: 'Test admin role',
  });

  await repos.rolePermission.save(
    permissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
  );

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin-password', 10);
  const adminUser = await repos.user.save({
    email: `admin-${orgId}@example.com`,
    firstName: 'Admin',
    lastName: 'User',
    passwordHash: adminPasswordHash,
    status: UserStatus.ACTIVE,
  });

  await repos.membership.save({
    userId: adminUser.id,
    organizationId: orgId,
    organizationName: orgName,
    roleId: adminRole.id,
  });

  // Generate admin token
  const adminTokens = await authService.getScopedToken(
    adminUser.id,
    orgId,
    `jti-admin-${orgId}`,
  );

  const result: TestOrganization = {
    organizationId: orgId,
    organizationName: orgName,
    adminUser,
    adminRole,
    adminToken: adminTokens.accessToken,
    permissions,
  };

  // Create regular user if requested
  if (includeRegularUser) {
    const regularRole = await repos.role.save({
      name: `Regular-${orgId}`,
      organizationId: orgId,
      isSystemRole: false,
      description: 'Test regular role',
    });

    // Assign only read permissions to regular user
    const readPermissions = permissions.filter((p) => p.action === 'read');
    await repos.rolePermission.save(
      readPermissions.map((p) => ({
        roleId: regularRole.id,
        permissionId: p.id,
      })),
    );

    const regularPasswordHash = await bcrypt.hash('regular-password', 10);
    const regularUser = await repos.user.save({
      email: `regular-${orgId}@example.com`,
      firstName: 'Regular',
      lastName: 'User',
      passwordHash: regularPasswordHash,
      status: UserStatus.ACTIVE,
    });

    await repos.membership.save({
      userId: regularUser.id,
      organizationId: orgId,
      organizationName: orgName,
      roleId: regularRole.id,
    });

    const regularTokens = await authService.getScopedToken(
      regularUser.id,
      orgId,
      `jti-regular-${orgId}`,
    );

    result.regularUser = regularUser;
    result.regularRole = regularRole;
    result.regularUserToken = regularTokens.accessToken;
  }

  return result;
}
