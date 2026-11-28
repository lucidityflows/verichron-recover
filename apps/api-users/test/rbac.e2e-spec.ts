import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  createTestOrganization,
  TestContext,
  TestOrganization,
} from './helpers/test-setup';

describe('RBAC Enforcement (E2E)', () => {
  let context: TestContext;
  let org: TestOrganization;

  beforeAll(async () => {
    context = await createTestApp();
    await cleanDatabase(context);

    // Create organization with admin and regular user
    org = await createTestOrganization(context, 'org-rbac-123', 'RBAC Test Org', true);
  });

  afterAll(async () => {
    await cleanDatabase(context);
    await context.dataSource.destroy();
    await context.app.close();
  });

  describe('Permission Enforcement on User Endpoints', () => {
    it('Admin with user:read should access GET /users', () => {
      return request(context.app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .expect(200);
    });

    it('Regular user with user:read should access GET /users', () => {
      return request(context.app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${org.regularUserToken}`)
        .expect(200);
    });

    it('Admin with user:create should access POST /users', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          email: 'new.rbac.user@example.com',
          firstName: 'New',
          lastName: 'User',
          roleId: org.adminRole.id,
        })
        .expect(201);

      expect(response.body.email).toBe('new.rbac.user@example.com');
    });

    it('Regular user without user:create should be forbidden from POST /users', () => {
      return request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${org.regularUserToken}`)
        .send({
          email: 'forbidden.user@example.com',
          firstName: 'Forbidden',
          lastName: 'User',
          roleId: org.regularRole!.id,
        })
        .expect(403);
    });

    it('Admin with user:update should access PATCH /users/:id', () => {
      return request(context.app.getHttpServer())
        .patch(`/users/${org.regularUser!.id}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({ firstName: 'Updated' })
        .expect(200);
    });

    it('Regular user without user:update should be forbidden from PATCH /users/:id', () => {
      return request(context.app.getHttpServer())
        .patch(`/users/${org.adminUser!.id}`)
        .set('Authorization', `Bearer ${org.regularUserToken}`)
        .send({ firstName: 'Hacked' })
        .expect(403);
    });

    it('Admin with user:delete should access DELETE /users/:id', async () => {
      // Create a user to delete
      const createResponse = await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          email: 'to.delete@example.com',
          firstName: 'To',
          lastName: 'Delete',
          roleId: org.adminRole.id,
        });

      const userId = createResponse.body.id;

      return request(context.app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .expect(204);
    });

    it('Regular user without user:delete should be forbidden from DELETE /users/:id', () => {
      return request(context.app.getHttpServer())
        .delete(`/users/${org.adminUser!.id}`)
        .set('Authorization', `Bearer ${org.regularUserToken}`)
        .expect(403);
    });
  });

  describe('Permission Enforcement on Role Endpoints', () => {
    it('Admin with role:read should access GET /rbac/roles', () => {
      return request(context.app.getHttpServer())
        .get('/rbac/roles')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .expect(200);
    });

    it('Regular user with role:read should access GET /rbac/roles', () => {
      return request(context.app.getHttpServer())
        .get('/rbac/roles')
        .set('Authorization', `Bearer ${org.regularUserToken}`)
        .expect(200);
    });

    it('Admin with role:create should access POST /rbac/roles', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          name: 'New RBAC Role',
          description: 'Test role creation',
        })
        .expect(201);

      expect(response.body.name).toBe('New RBAC Role');
    });

    it('Regular user without role:create should be forbidden from POST /rbac/roles', () => {
      return request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${org.regularUserToken}`)
        .send({
          name: 'Forbidden Role',
          description: 'Should fail',
        })
        .expect(403);
    });

    it('Admin with role:update should access PATCH /rbac/roles/:id', () => {
      return request(context.app.getHttpServer())
        .patch(`/rbac/roles/${org.regularRole!.id}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({ description: 'Updated description' })
        .expect(200);
    });

    it('Regular user without role:update should be forbidden from PATCH /rbac/roles/:id', () => {
      return request(context.app.getHttpServer())
        .patch(`/rbac/roles/${org.adminRole!.id}`)
        .set('Authorization', `Bearer ${org.regularUserToken}`)
        .send({ description: 'Hacked' })
        .expect(403);
    });
  });

  describe('Role Assignment Permissions', () => {
    it('Admin with role:assign should be able to assign role to user', async () => {
      // Create a new role
      const roleResponse = await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          name: 'Assignable Role',
          description: 'For assignment test',
        });

      const newRoleId = roleResponse.body.id;

      // Assign role to regular user
      return request(context.app.getHttpServer())
        .post(`/rbac/users/${org.regularUser!.id}/roles`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({ roleId: newRoleId })
        .expect(201);
    });

    it('Regular user without role:assign should be forbidden from assigning roles', async () => {
      return request(context.app.getHttpServer())
        .post(`/rbac/users/${org.adminUser!.id}/roles`)
        .set('Authorization', `Bearer ${org.regularUserToken}`)
        .send({ roleId: org.regularRole!.id })
        .expect(403);
    });
  });

  describe('Permission Management', () => {
    let testRoleId: string;

    beforeAll(async () => {
      // Create a test role for permission management
      const response = await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          name: 'Permission Test Role',
          description: 'For testing permission assignment',
        });

      testRoleId = response.body.id;
    });

    it('Admin should be able to assign permissions to role', async () => {
      const permission = org.permissions[0];

      return request(context.app.getHttpServer())
        .post(`/rbac/roles/${testRoleId}/permissions`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({ permissionIds: [permission.id] })
        .expect(201);
    });

    it('Admin should be able to view role with assigned permissions', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/rbac/roles/${testRoleId}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .expect(200);

      expect(response.body.permissions).toBeInstanceOf(Array);
      expect(response.body.permissions.length).toBeGreaterThan(0);
    });

    it('Admin should be able to remove permission from role', async () => {
      const permission = org.permissions[0];

      return request(context.app.getHttpServer())
        .delete(`/rbac/roles/${testRoleId}/permissions/${permission.id}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .expect(204);
    });
  });

  describe('System Role Protection', () => {
    let systemRoleId: string;

    beforeAll(async () => {
      // Create a system role
      const systemRole = await context.repos.role.save({
        name: 'System Role',
        organizationId: org.organizationId,
        isSystemRole: true,
        description: 'Protected system role',
      });
      systemRoleId = systemRole.id;
    });

    it('Admin should NOT be able to delete system roles', () => {
      return request(context.app.getHttpServer())
        .delete(`/rbac/roles/${systemRoleId}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .expect(403); // Forbidden - system roles cannot be deleted
    });

    it('Admin should be able to delete custom roles', async () => {
      // Create a custom role
      const roleResponse = await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          name: 'Deletable Role',
          description: 'Can be deleted',
        });

      const customRoleId = roleResponse.body.id;

      return request(context.app.getHttpServer())
        .delete(`/rbac/roles/${customRoleId}`)
        .set('Authorization', `Bearer ${org.adminToken}`)
        .expect(204);
    });
  });

  describe('Permission Check Endpoints', () => {
    it('Should check single permission for user', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/rbac/check-permission')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          userId: org.adminUser.id,
          permission: 'user:read',
        })
        .expect(200);

      expect(response.body.hasPermission).toBe(true);
    });

    it('Should check multiple permissions for user', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/rbac/check-permissions')
        .set('Authorization', `Bearer ${org.adminToken}`)
        .send({
          userId: org.adminUser.id,
          permissions: ['user:read', 'user:create', 'user:update'],
        })
        .expect(200);

      expect(response.body.permissions).toHaveProperty('user:read');
      expect(response.body.permissions).toHaveProperty('user:create');
      expect(response.body.permissions).toHaveProperty('user:update');
    });
  });
});
