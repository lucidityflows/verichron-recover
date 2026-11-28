import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { UserEntity, UserMembershipEntity } from '../src/profiles/entities';
import { UserStatus } from '@verichron/enums';
import { RoleEntity, PermissionEntity, RolePermissionEntity } from '../src/rbac/entities';
import * as bcrypt from 'bcrypt';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Test Data
  const password = 'super-secret-password';
  let testUser: UserEntity;
  let testRole: RoleEntity;
  let testPermission: PermissionEntity;
  let testMembership: UserMembershipEntity;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.use(cookieParser());
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // --- Test Data Setup ---
    console.log('Setting up test data...');
    const userRepo = dataSource.getRepository(UserEntity);
    const roleRepo = dataSource.getRepository(RoleEntity);
    const permRepo = dataSource.getRepository(PermissionEntity);
    const rolePermRepo = dataSource.getRepository(RolePermissionEntity);
    const membershipRepo = dataSource.getRepository(UserMembershipEntity);

    // Clean up previous test data
    await dataSource.query('DELETE FROM user_memberships');
    await dataSource.query('DELETE FROM role_permissions');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM roles');
    await dataSource.query('DELETE FROM permissions');

    // Create entities
    testPermission = await permRepo.save({ code: 'user:read', description: 'Read users', resource: 'user', action: 'read' });
    testRole = await roleRepo.save({ name: 'Test Admin', description: 'Test Admin Role', organizationId: 'org-uuid-123', isSystemRole: false });
    await rolePermRepo.save({ roleId: testRole.id, permissionId: testPermission.id });
    
    const passwordHash = await bcrypt.hash(password, 10);
    testUser = await userRepo.save({
      email: 'integration-test@example.com',
      firstName: 'Integration',
      lastName: 'Test',
      passwordHash,
      status: UserStatus.ACTIVE,
    });

    testMembership = await membershipRepo.save({
      userId: testUser.id,
      organizationId: 'org-uuid-123',
      roleId: testRole.id,
    });
    console.log('Test data setup complete.');
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('POST /auth/login -> POST /auth/token', () => {
    let actCookie: string;

    it('should fail to login with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrong-password' })
        .expect(401);
    });

    it('step 1: should login successfully and return an ACT cookie and organization list', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: password })
        .expect(200);

      expect(response.body.organizations).toHaveLength(1);
      expect(response.body.organizations[0].organizationId).toEqual(testMembership.organizationId);
      expect(response.body.organizations[0].role).toEqual(testRole.name);

      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('act=');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('SameSite=Strict');
      actCookie = cookieHeader.split(';')[0]; // Extract just the act=... part
    });

    it('step 2: should use the ACT to get a scoped JWT', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/token')
        .set('Cookie', actCookie)
        .send({ organizationId: testMembership.organizationId })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should fail to reuse the same ACT (replay attack)', () => {
      return request(app.getHttpServer())
        .post('/auth/token')
        .set('Cookie', actCookie) // Use the same cookie again
        .send({ organizationId: testMembership.organizationId })
        .expect(403); // Forbidden
    });
  });
});
