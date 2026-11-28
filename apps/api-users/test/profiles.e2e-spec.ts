
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { UserEntity } from '../src/profiles/entities/user.entity';
import { UserStatus } from '@verichron/enums';
import { RoleEntity } from '../src/rbac/entities/role.entity';
import { PermissionEntity } from '../src/rbac/entities/permission.entity';
import { RolePermissionEntity } from '../src/rbac/entities/role-permission.entity';
import { UserMembershipEntity } from '../src/profiles/entities/user-membership.entity';

describe('ProfilesController (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;

  // Repositories
  let userRepo: Repository<UserEntity>;
  let roleRepo: Repository<RoleEntity>;
  let permRepo: Repository<PermissionEntity>;
  let rolePermRepo: Repository<RolePermissionEntity>;
  let membershipRepo: Repository<UserMembershipEntity>;

  // Test Data
  const testOrgId = 'org-e2e-test-123';
  const adminPassword = 'admin-password';
  let adminUser: UserEntity;
  let regularUser: UserEntity;
  let adminRole: RoleEntity;
  let adminToken: string;
  let regularUserToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.use(cookieParser());
    await app.init();

    // Get services and data source
    dataSource = moduleFixture.get<DataSource>(DataSource);
    authService = moduleFixture.get<AuthService>(AuthService);

    // Get repositories
    userRepo = dataSource.getRepository(UserEntity);
    roleRepo = dataSource.getRepository(RoleEntity);
    permRepo = dataSource.getRepository(PermissionEntity);
    rolePermRepo = dataSource.getRepository(RolePermissionEntity);
    membershipRepo = dataSource.getRepository(UserMembershipEntity);

    // Clean database
    await dataSource.query('DELETE FROM user_memberships');
    await dataSource.query('DELETE FROM role_permissions');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM roles');
    await dataSource.query('DELETE FROM permissions');

    // --- Create Permissions and Roles ---
    const userPermissionsInfo = [
      { code: 'user:create', description: '...' },
      { code: 'user:read', description: '...' },
      { code: 'user:update', description: '...' },
      { code: 'user:delete', description: '...' },
      { code: 'role:assign', description: '...' },
    ];
    const permissions = await permRepo.save(userPermissionsInfo.map(p => ({ ...p, resource: 'user', action: '*'})));
    adminRole = await roleRepo.save({ name: 'Test E2E Admin', organizationId: testOrgId, isSystemRole: false });
    await rolePermRepo.save(permissions.map(p => ({ roleId: adminRole.id, permissionId: p.id })));
    const regularRole = await roleRepo.save({ name: 'Test E2E Regular', organizationId: testOrgId, isSystemRole: false });

    // --- Create Users and Memberships ---
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    adminUser = await userRepo.save({
      email: 'admin.e2e@example.com',
      firstName: 'Admin',
      lastName: 'E2E',
      passwordHash: adminPasswordHash,
      status: UserStatus.ACTIVE,
    });
    await membershipRepo.save({ userId: adminUser.id, organizationId: testOrgId, roleId: adminRole.id });

    const regularPasswordHash = await bcrypt.hash('regular-password', 10);
    regularUser = await userRepo.save({
      email: 'regular.e2e@example.com',
      firstName: 'Regular',
      lastName: 'E2E',
      passwordHash: regularPasswordHash,
      status: UserStatus.ACTIVE,
    });
    await membershipRepo.save({ userId: regularUser.id, organizationId: testOrgId, roleId: regularRole.id });

    // --- Generate Auth Tokens ---
    const adminTokens = await authService.getScopedToken(adminUser.id, testOrgId, 'dummy-jti-admin');
    adminToken = adminTokens.accessToken;
    const regularTokens = await authService.getScopedToken(regularUser.id, testOrgId, 'dummy-jti-regular');
    regularUserToken = regularTokens.accessToken;
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('User Management Lifecycle', () => {
    let newUserId: string;
    const newUserEmail = 'new.e2e.user@example.com';

    it('POST /users -> Admin should be able to invite a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'New',
          lastName: 'User',
          email: newUserEmail,
          roleId: adminRole.id, // Assigning admin role for simplicity
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.email).toEqual(newUserEmail);
      expect(response.body.status).toEqual(UserStatus.PENDING);
      newUserId = response.body.id;
    });

    it('should create the user in the database with PENDING status', async () => {
      const userInDb = await userRepo.findOneBy({ id: newUserId });
      expect(userInDb).toBeDefined();
      expect(userInDb!.status).toEqual(UserStatus.PENDING);
    });

    it('GET /users -> Regular user without permissions should be forbidden', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it('GET /users -> Admin should be able to list users, including the new one', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.some((user: any) => user.id === newUserId)).toBe(true);
    });

    it('PATCH /users/:id -> Admin can update the new user\'s profile', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${newUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lastName: 'Updated' })
        .expect(200);

      expect(response.body.lastName).toEqual('Updated');
    });

    it('DELETE /users/:id -> Admin can deactivate the new user', () => {
      return request(app.getHttpServer())
        .delete(`/users/${newUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should update the user status to INACTIVE in the database', async () => {
      const userInDb = await userRepo.findOneBy({ id: newUserId });
      expect(userInDb!.status).toEqual(UserStatus.INACTIVE);
    });
  });
});
