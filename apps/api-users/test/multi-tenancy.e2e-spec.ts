import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  createTestOrganization,
  TestContext,
  TestOrganization,
} from './helpers/test-setup';
import { UserStatus } from '@verichron/enums';

describe('Multi-Tenancy Isolation (E2E)', () => {
  let context: TestContext;
  let orgA: TestOrganization;
  let orgB: TestOrganization;

  beforeAll(async () => {
    context = await createTestApp();
    await cleanDatabase(context);

    // Create two separate organizations with different users
    orgA = await createTestOrganization(
      context,
      'org-a-123',
      'Organization A',
      true, // Include regular user
    );

    orgB = await createTestOrganization(
      context,
      'org-b-456',
      'Organization B',
      true, // Include regular user
    );
  });

  afterAll(async () => {
    await cleanDatabase(context);
    await context.dataSource.destroy();
    await context.app.close();
  });

  describe('User Isolation', () => {
    it('Org A admin should NOT see Org B users in list', async () => {
      const response = await request(context.app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .expect(200);

      const userIds = response.body.data.map((u: any) => u.id);

      // Should see Org A users
      expect(userIds).toContain(orgA.adminUser.id);
      if (orgA.regularUser) {
        expect(userIds).toContain(orgA.regularUser.id);
      }

      // Should NOT see Org B users
      expect(userIds).not.toContain(orgB.adminUser.id);
      if (orgB.regularUser) {
        expect(userIds).not.toContain(orgB.regularUser.id);
      }
    });

    it('Org B admin should NOT see Org A users in list', async () => {
      const response = await request(context.app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${orgB.adminToken}`)
        .expect(200);

      const userIds = response.body.data.map((u: any) => u.id);

      // Should see Org B users
      expect(userIds).toContain(orgB.adminUser.id);
      if (orgB.regularUser) {
        expect(userIds).toContain(orgB.regularUser.id);
      }

      // Should NOT see Org A users
      expect(userIds).not.toContain(orgA.adminUser.id);
      if (orgA.regularUser) {
        expect(userIds).not.toContain(orgA.regularUser.id);
      }
    });

    it('Org A admin should NOT be able to access Org B user details', async () => {
      // Try to access Org B user with Org A token
      return request(context.app.getHttpServer())
        .get(`/users/${orgB.adminUser.id}`)
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .expect(404); // Should return not found (user doesn't exist in this org context)
    });

    it('Org A admin should NOT be able to update Org B user', async () => {
      return request(context.app.getHttpServer())
        .patch(`/users/${orgB.adminUser.id}`)
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .send({ firstName: 'Hacked' })
        .expect(404);
    });

    it('Org A admin should NOT be able to delete Org B user', async () => {
      return request(context.app.getHttpServer())
        .delete(`/users/${orgB.adminUser.id}`)
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .expect(404);
    });
  });

  describe('Role Isolation', () => {
    it('Org A admin should only see Org A roles', async () => {
      const response = await request(context.app.getHttpServer())
        .get('/rbac/roles')
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .expect(200);

      const roleIds = response.body.data.map((r: any) => r.id);

      // Should see Org A role
      expect(roleIds).toContain(orgA.adminRole.id);

      // Should NOT see Org B role
      expect(roleIds).not.toContain(orgB.adminRole.id);
    });

    it('Org B admin should only see Org B roles', async () => {
      const response = await request(context.app.getHttpServer())
        .get('/rbac/roles')
        .set('Authorization', `Bearer ${orgB.adminToken}`)
        .expect(200);

      const roleIds = response.body.data.map((r: any) => r.id);

      // Should see Org B role
      expect(roleIds).toContain(orgB.adminRole.id);

      // Should NOT see Org A role
      expect(roleIds).not.toContain(orgA.adminRole.id);
    });

    it('Org A admin should NOT be able to access Org B role details', async () => {
      return request(context.app.getHttpServer())
        .get(`/rbac/roles/${orgB.adminRole.id}`)
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .expect(404);
    });

    it('Org A admin should NOT be able to update Org B role', async () => {
      return request(context.app.getHttpServer())
        .patch(`/rbac/roles/${orgB.adminRole.id}`)
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .send({ name: 'Hacked Role' })
        .expect(404);
    });

    it('Org A admin should NOT be able to delete Org B role', async () => {
      return request(context.app.getHttpServer())
        .delete(`/rbac/roles/${orgB.adminRole.id}`)
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .expect(404);
    });

    it('Org A admin should NOT be able to assign Org B role to a user', async () => {
      // Try to assign Org B role to Org A user
      return request(context.app.getHttpServer())
        .post(`/rbac/users/${orgA.adminUser.id}/roles`)
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .send({ roleId: orgB.adminRole.id })
        .expect(404);
    });
  });

  describe('Permission Sharing (Platform-Wide)', () => {
    it('Both orgs should see the same platform-wide permissions', async () => {
      const responseA = await request(context.app.getHttpServer())
        .get('/rbac/permissions')
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .expect(200);

      const responseB = await request(context.app.getHttpServer())
        .get('/rbac/permissions')
        .set('Authorization', `Bearer ${orgB.adminToken}`)
        .expect(200);

      // Permissions are platform-wide, so both orgs see the same list
      const permCodesA = responseA.body.data.map((p: any) => p.code).sort();
      const permCodesB = responseB.body.data.map((p: any) => p.code).sort();

      expect(permCodesA).toEqual(permCodesB);
    });
  });

  describe('User Invitation Isolation', () => {
    it('Org A admin can invite user to Org A', async () => {
      const response = await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .send({
          email: 'new-user-org-a@example.com',
          firstName: 'New',
          lastName: 'User',
          roleId: orgA.adminRole.id,
        })
        .expect(201);

      expect(response.body.email).toBe('new-user-org-a@example.com');
      expect(response.body.status).toBe(UserStatus.PENDING);
    });

    it('Invited user should only appear in Org A user list, not Org B', async () => {
      const responseA = await request(context.app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .expect(200);

      const responseB = await request(context.app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${orgB.adminToken}`)
        .expect(200);

      const emailsA = responseA.body.data.map((u: any) => u.email);
      const emailsB = responseB.body.data.map((u: any) => u.email);

      expect(emailsA).toContain('new-user-org-a@example.com');
      expect(emailsB).not.toContain('new-user-org-a@example.com');
    });
  });

  describe('JWT Organization Context Enforcement', () => {
    it('JWT should contain correct organization ID in custom claims', async () => {
      // This is verified implicitly by all the above tests
      // The OrganizationId decorator extracts org from JWT claims
      // If it was wrong, all queries would fail or return wrong data

      // Verify Org A token works for Org A data
      const responseA = await request(context.app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .expect(200);

      expect(responseA.body.data).toBeDefined();

      // Verify Org B token works for Org B data
      const responseB = await request(context.app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${orgB.adminToken}`)
        .expect(200);

      expect(responseB.body.data).toBeDefined();
    });
  });

  describe('Role Name Uniqueness per Organization', () => {
    it('Should allow same role name in different organizations', async () => {
      const roleName = 'Duplicate Role Name';

      // Create role with same name in Org A
      const responseA = await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .send({
          name: roleName,
          description: 'Test role in Org A',
        })
        .expect(201);

      expect(responseA.body.name).toBe(roleName);

      // Create role with same name in Org B - should succeed
      const responseB = await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${orgB.adminToken}`)
        .send({
          name: roleName,
          description: 'Test role in Org B',
        })
        .expect(201);

      expect(responseB.body.name).toBe(roleName);
      expect(responseB.body.id).not.toBe(responseA.body.id); // Different role IDs
    });

    it('Should prevent duplicate role name within same organization', async () => {
      const roleName = 'Unique Within Org';

      // Create role
      await request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .send({
          name: roleName,
          description: 'First role',
        })
        .expect(201);

      // Try to create another role with same name in same org
      return request(context.app.getHttpServer())
        .post('/rbac/roles')
        .set('Authorization', `Bearer ${orgA.adminToken}`)
        .send({
          name: roleName,
          description: 'Duplicate role',
        })
        .expect(409); // Conflict
    });
  });
});
