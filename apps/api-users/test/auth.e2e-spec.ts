import request from 'supertest';
import * as bcrypt from 'bcrypt';
import {
  createTestApp,
  cleanDatabase,
  TestContext,
} from './helpers/test-setup';
import { UserStatus } from '@verichron/enums';

describe('AuthController (E2E)', () => {
  let context: TestContext;
  const testOrgId = 'org-auth-e2e-123';
  const testOrgName = 'Auth Test Org';
  const userEmail = 'test.auth@example.com';
  const userPassword = 'Test123!@#';
  let userId: string;

  beforeAll(async () => {
    context = await createTestApp();
    await cleanDatabase(context);

    // Create test user with membership
    const passwordHash = await bcrypt.hash(userPassword, 10);
    const user = await context.repos.user.save({
      email: userEmail,
      firstName: 'Test',
      lastName: 'User',
      passwordHash,
      status: UserStatus.ACTIVE,
    });
    userId = user.id;

    // Create role with permissions
    const permissions = await context.repos.permission.save([
      {
        code: 'user:read',
        description: 'Read users',
        resource: 'user',
        action: 'read',
      },
    ]);

    const role = await context.repos.role.save({
      name: 'Test Role',
      organizationId: testOrgId,
      isSystemRole: false,
    });

    await context.repos.rolePermission.save({
      roleId: role.id,
      permissionId: permissions[0].id,
    });

    // Create membership
    await context.repos.membership.save({
      userId: user.id,
      organizationId: testOrgId,
      organizationName: testOrgName,
      roleId: role.id,
    });
  });

  afterAll(async () => {
    await cleanDatabase(context);
    await context.dataSource.destroy();
    await context.app.close();
  });

  describe('Two-Step Authentication Flow', () => {
    let actCookie: string;
    let accessToken: string;
    let refreshToken: string;

    it('POST /auth/login - Step 1: Should authenticate and return ACT cookie + org list', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userEmail,
          password: userPassword,
        })
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('act');
      expect(response.body).toHaveProperty('organizations');
      expect(response.body.organizations.organizations).toBeInstanceOf(Array);
      expect(response.body.organizations.organizations).toHaveLength(1);

      // Verify organization data
      const org = response.body.organizations.organizations[0];
      expect(org.organizationId).toBe(testOrgId);
      expect(org.organizationName).toBe(testOrgName);

      // Verify ACT cookie is set
      const rawCookies = response.headers['set-cookie'];
      const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
      
      expect(cookies).toBeDefined();
      const actCookieHeader = cookies.find((c: string) =>
        c.startsWith('act='),
      );
      expect(actCookieHeader).toBeDefined();

      // Extract ACT cookie for next request
      actCookie = actCookieHeader!.split(';')[0];
    });

    it('POST /auth/login - Should fail with invalid credentials', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userEmail,
          password: 'wrong-password',
        })
        .expect(401);

      expect(response.body.message).toContain('credentials');
    });

    it('POST /auth/token - Step 2: Should exchange ACT for scoped JWT', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/auth/token')
        .set('Cookie', actCookie!)
        .send({
          organizationId: testOrgId,
        })
        .expect(200);

      // Verify tokens are returned
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.refreshToken).toBeTruthy();

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;

      // Verify ACT cookie is cleared
      const rawCookies = response.headers['set-cookie'];
      const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];

      const actClearCookie = cookies?.find((c: string) =>
        c.startsWith('act=;'),
      );
      expect(actClearCookie).toBeDefined();
    });

    it('POST /auth/token - Should fail without ACT cookie', () => {
      return request(context.app.getHttpServer())
        .post('/auth/token')
        .send({
          organizationId: testOrgId,
        })
        .expect(401);
    });

    it('POST /auth/token - Should fail with invalid organization ID', async () => {
      // Get a new ACT by logging in again
      const loginResponse = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userEmail,
          password: userPassword,
        });

      const rawCookies = loginResponse.headers['set-cookie'];
      const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
      
      const newActCookie = cookies.find((c: string) => c.startsWith('act='));

      // Try to get token for organization user is not a member of
      return request(context.app.getHttpServer())
        .post('/auth/token')
        .set('Cookie', newActCookie!)
        .send({
          organizationId: 'invalid-org-id',
        })
        .expect(401);
    });

    it('GET /users - Should access protected endpoint with JWT', async () => {
      const response = await request(context.app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('GET /users - Should fail without JWT', () => {
      return request(context.app.getHttpServer()).get('/users').expect(401);
    });

    it('GET /users - Should fail with invalid JWT', () => {
      return request(context.app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('POST /auth/refresh - Should refresh access token', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(accessToken); // New token
    });

    it('POST /auth/refresh - Should fail with invalid refresh token', () => {
      return request(context.app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });
  });

  describe('Context Switching', () => {
    let secondOrgId: string;
    let accessToken: string;

    beforeAll(async () => {
      // Create second organization for the same user
      secondOrgId = 'org-auth-e2e-456';
      const secondOrgName = 'Second Test Org';

      const role = await context.repos.role.save({
        name: 'Test Role 2',
        organizationId: secondOrgId,
        isSystemRole: false,
      });

      await context.repos.membership.save({
        userId,
        organizationId: secondOrgId,
        organizationName: secondOrgName,
        roleId: role.id,
      });

      // Get token for first org
      const loginResponse = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userEmail,
          password: userPassword,
        });

      const rawCookies = loginResponse.headers['set-cookie'];
      const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
      
      const actCookie = cookies.find((c: string) => c.startsWith('act='));

      const tokenResponse = await request(context.app.getHttpServer())
        .post('/auth/token')
        .set('Cookie', actCookie!)
        .send({ organizationId: testOrgId });

      accessToken = tokenResponse.body.accessToken;
    });

    it('POST /auth/switch-context - Should switch to different organization', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/auth/switch-context')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          organizationId: secondOrgId,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(accessToken); // New token for different org
    });

    it('POST /auth/switch-context - Should fail for organization user is not member of', () => {
      return request(context.app.getHttpServer())
        .post('/auth/switch-context')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          organizationId: 'non-existent-org',
        })
        .expect(401);
    });

    it('POST /auth/login - Should return multiple organizations if user has multiple memberships', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userEmail,
          password: userPassword,
        })
        .expect(200);

      expect(response.body.organizations.organizations).toHaveLength(2);

      const orgIds = response.body.organizations.organizations.map(
        (o: any) => o.organizationId,
      );
      expect(orgIds).toContain(testOrgId);
      expect(orgIds).toContain(secondOrgId);
    });
  });
});
