import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  createTestOrganization,
  TestContext,
  TestOrganization,
} from './helpers/test-setup';
import { EventPublisher } from '@verichron/event-publisher';

describe('Event Publishing (E2E)', () => {
  let context: TestContext;
  let org: TestOrganization;
  let eventPublisher: EventPublisher;
  let publishSpy: jest.SpyInstance;

  beforeAll(async () => {
    context = await createTestApp();
    await cleanDatabase(context);

    org = await createTestOrganization(context, 'org-events-123', 'Events Test Org', false);

    // Get EventPublisher and spy on publish method
    eventPublisher = context.app.get<EventPublisher>(EventPublisher);
    publishSpy = jest.spyOn(eventPublisher, 'publish');
  });

  afterAll(async () => {
    await cleanDatabase(context);
    await context.dataSource.destroy();
    await context.app.close();
  });

  beforeEach(() => {
    publishSpy.mockClear();
  });

  describe('User Profile Events', () => {
    it('POST /users should publish UserCreated event', async () => {
      await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          email: 'events.test@example.com',
          firstName: 'Events',
          lastName: 'Test',
          roleId: org.adminRole.id,
        })
        .expect(201);

      // Verify event was published
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.user.created',
        'api-users',
        expect.objectContaining({
          email: 'events.test@example.com',
          organizationId: org.organizationId,
        }),
      );
    });

    it('PATCH /users/:id should publish UserProfileUpdated event', async () => {
      // Create user first
      const createResponse = await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          email: 'update.test@example.com',
          firstName: 'Update',
          lastName: 'Test',
          roleId: org.adminRole.id,
        });

      const userId = createResponse.body.id;
      publishSpy.mockClear(); // Clear the UserCreated event

      // Update user
      await request(context.app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({ firstName: 'Updated' })
        .expect(200);

      // Verify event was published
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.user.profile_updated',
        'api-users',
        expect.objectContaining({
          userId,
          organizationId: org.organizationId,
        }),
      );
    });

    it('DELETE /users/:id should publish UserStatusChanged event', async () => {
      // Create user first
      const createResponse = await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          email: 'delete.test@example.com',
          firstName: 'Delete',
          lastName: 'Test',
          roleId: org.adminRole.id,
        });

      const userId = createResponse.body.id;
      publishSpy.mockClear();

      // Delete user (soft delete - status change)
      await request(context.app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .expect(204);

      // Verify event was published
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.user.status_changed',
        'api-users',
        expect.objectContaining({
          userId,
          organizationId: org.organizationId,
          newStatus: 'INACTIVE',
        }),
      );
    });
  });

  describe('RBAC Events', () => {
    it('POST /rbac/roles should publish RoleCreated event', async () => {
      await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          name: 'Event Test Role',
          description: 'For event testing',
        })
        .expect(201);

      // Verify event was published
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.role.created',
        'api-users',
        expect.objectContaining({
          roleName: 'Event Test Role',
          organizationId: org.organizationId,
        }),
      );
    });

    it('PATCH /rbac/roles/:id should publish RoleUpdated event', async () => {
      // Create role first
      const createResponse = await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          name: 'Update Event Role',
          description: 'Original description',
        });

      const roleId = createResponse.body.id;
      publishSpy.mockClear();

      // Update role
      await request(context.app.getHttpServer())
        .patch(`/rbac/roles/${roleId}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({ description: 'Updated description' })
        .expect(200);

      // Verify event was published
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.role.updated',
        'api-users',
        expect.objectContaining({
          roleId,
          organizationId: org.organizationId,
        }),
      );
    });

    it('DELETE /rbac/roles/:id should publish RoleDeleted event', async () => {
      // Create role first
      const createResponse = await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          name: 'Delete Event Role',
          description: 'To be deleted',
        });

      const roleId = createResponse.body.id;
      publishSpy.mockClear();

      // Delete role
      await request(context.app.getHttpServer())
        .delete(`/rbac/roles/${roleId}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .expect(204);

      // Verify event was published
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.role.deleted',
        'api-users',
        expect.objectContaining({
          roleId,
          organizationId: org.organizationId,
        }),
      );
    });

    it('POST /rbac/roles/:id/permissions should publish PermissionsChanged event', async () => {
      // Create role first
      const createResponse = await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          name: 'Permission Event Role',
          description: 'For permission events',
        });

      const roleId = createResponse.body.id;
      publishSpy.mockClear();

      const permission = org.permissions[0];

      // Assign permission
      await request(context.app.getHttpServer())
        .post(`/rbac/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({ permissionIds: [permission.id] })
        .expect(201);

      // Verify event was published
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.permissions.changed',
        'api-users',
        expect.objectContaining({
          roleId,
          organizationId: org.organizationId,
        }),
      );
    });

    it('POST /rbac/users/:userId/roles should publish RoleAssigned event', async () => {
      // Create user first
      const userResponse = await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          email: 'role.assign.test@example.com',
          firstName: 'Role',
          lastName: 'Assign',
          roleId: org.adminRole.id,
        });

      const userId = userResponse.body.id;

      // Create another role to assign
      const roleResponse = await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          name: 'Assignable Role',
          description: 'To be assigned',
        });

      const roleId = roleResponse.body.id;
      publishSpy.mockClear();

      // Assign role to user
      await request(context.app.getHttpServer())
        .post(`/rbac/users/${userId}/roles`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({ roleId })
        .expect(201);

      // Verify event was published
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.role.assigned',
        'api-users',
        expect.objectContaining({
          userId,
          roleId,
          organizationId: org.organizationId,
        }),
      );
    });

    it('DELETE /rbac/users/:userId/roles/:roleId should publish RoleUnassigned event', async () => {
      // Create user with role
      const userResponse = await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          email: 'role.unassign.test@example.com',
          firstName: 'Role',
          lastName: 'Unassign',
          roleId: org.adminRole.id,
        });

      const userId = userResponse.body.id;
      const roleId = org.adminRole.id;
      publishSpy.mockClear();

      // Unassign role from user
      await request(context.app.getHttpServer())
        .delete(`/rbac/users/${userId}/roles/${roleId}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .expect(204);

      // Verify event was published
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.role.unassigned',
        'api-users',
        expect.objectContaining({
          userId,
          roleId,
          organizationId: org.organizationId,
        }),
      );
    });
  });

  describe('Authentication Events', () => {
    it('POST /auth/login with valid credentials should publish LoginSuccess event', async () => {
      await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: org.adminUser.email,
          password: 'admin-password', // From test-setup.ts
        })
        .expect(200);

      // Verify event was published
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.auth.login_success',
        'api-users',
        expect.objectContaining({
          userId: org.adminUser.id,
          email: org.adminUser.email,
          loginMethod: 'password',
        }),
      );
    });

    it('POST /auth/login with invalid credentials should publish LoginFailed event', async () => {
      await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: org.adminUser.email,
          password: 'wrong-password',
        })
        .expect(401);

      // Verify event was published
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.auth.login_failed',
        'api-users',
        expect.objectContaining({
          email: org.adminUser.email,
          reason: 'invalid_credentials',
        }),
      );
    });

    it('POST /auth/token should publish TokenIssued event', async () => {
      // First login to get ACT
      const loginResponse = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: org.adminUser.email,
          password: 'admin-password',
        });

      const rawCookies = loginResponse.headers['set-cookie'];
      const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
      
      const actCookie = cookies.find((c: string) => c.startsWith('act='));
      publishSpy.mockClear(); // Clear login events

      // Exchange ACT for token
      await request(context.app.getHttpServer())
        .post('/auth/token')
        .set('Cookie', actCookie!)
        .send({ organizationId: org.organizationId })
        .expect(200);

      // Verify TokenIssued events were published (both access and refresh)
      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.auth.token_issued',
        'api-users',
        expect.objectContaining({
          userId: org.adminUser.id,
          organizationId: org.organizationId,
          tokenType: 'access',
          issuanceMethod: 'login',
        }),
      );

      expect(publishSpy).toHaveBeenCalledWith(
        'users-v1',
        'users.auth.token_issued',
        'api-users',
        expect.objectContaining({
          userId: org.adminUser.id,
          organizationId: org.organizationId,
          tokenType: 'refresh',
          issuanceMethod: 'login',
        }),
      );
    });
  });
});
