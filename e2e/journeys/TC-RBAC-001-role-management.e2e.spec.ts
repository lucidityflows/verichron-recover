/**
 * TC-RBAC-001: Role Management
 *
 * @system-rule R-RBAC-001
 *
 * ## SYSTEM RULE: Role-Based Access Control (RBAC) Management
 *
 * Organization admins must be able to manage the complete lifecycle of custom roles within their organization:
 * - **Create custom roles** with names, descriptions, and optional initial permissions
 * - **List roles** with pagination - see only roles within their organization
 * - **View role details** including all assigned permissions
 * - **Update roles** (name, description)
 * - **Delete custom roles** (system roles are protected from deletion)
 * - **Assign permissions** to roles (add/remove individual or bulk permissions)
 * - **Assign roles to users** - user permissions are dynamically computed from their role
 * - **Data isolation** must be enforced - organizations cannot see or modify other organizations' roles
 * - **System role protection** - default roles (ORG_ADMIN, ORG_USER) cannot be deleted
 */

import {
  createUsersDbHelper,
  createOrganizationsDbHelper,
  DatabaseHelper,
} from '../helpers/database.helper';
import { createApiUsersClient, ApiUsersClient } from '../helpers/api-client.helper';
import {
  createUserFactory,
  createRoleFactory,
  createOrganizationFactory,
  createOrganizationProfileFactory,
} from '../fixtures';
import { OrganizationStatus, EmailCategory } from '@verichron/enums';

describe('TC-RBAC-001: Role Management', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let apiUsers: ApiUsersClient;

  beforeAll(async () => {
    // Initialize database connections
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();

    // Ensure a clean slate for the test
    await usersDb.cleanAllTables();
    await orgsDb.cleanAllTables();

    // Initialize API client
    apiUsers = createApiUsersClient();
  });

  afterAll(async () => {
    await usersDb.disconnect();
    await orgsDb.disconnect();
  });

  describe('Scenario 1: Fresh Data Journey (Create role from scratch)', () => {
    let org1Id: string;
    let org2Id: string;
    let org1AdminToken: string;
    let org2AdminToken: string;
    let org1UserId: string;
    let org2UserId: string;
    let customRoleId: string;
    let org1AdminRoleId: string;
    let customRoleUserId: string; // User created with custom role

    beforeAll(async () => {
      const timestamp = Date.now();
      const userFactory = createUserFactory(usersDb.getDataSource());
      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const orgProfileFactory = createOrganizationProfileFactory(orgsDb.getDataSource());

      // Create two organizations
      const org1 = await orgFactory.createOrganization({
        name: `Org1-RoleTest-${timestamp}`,
        status: OrganizationStatus.ACTIVE,
      });
      org1Id = org1.id;

      await orgProfileFactory.addEmail({
        organizationId: org1Id,
        email: `org1-roletest-${timestamp}@test.com`,
        isPrimary: true,
        emailCategory: EmailCategory.GENERAL,
      });

      const org2 = await orgFactory.createOrganization({
        name: `Org2-RoleTest-${timestamp}`,
        status: OrganizationStatus.ACTIVE,
      });
      org2Id = org2.id;

      await orgProfileFactory.addEmail({
        organizationId: org2Id,
        email: `org2-roletest-${timestamp}@test.com`,
        isPrimary: true,
        emailCategory: EmailCategory.GENERAL,
      });

      // Create admin roles for both orgs with full permissions
      const org1AdminRole = await roleFactory.createOrgAdminRole(org1Id);
      org1AdminRoleId = org1AdminRole.id;

      const org2AdminRole = await roleFactory.createOrgAdminRole(org2Id);

      // Create admin users for both orgs
      const org1Admin = await userFactory.createOrgAdmin(
        org1Id,
        `Org1-RoleTest-${timestamp}`,
        org1AdminRole.id,
        {
          email: `admin1-roletest-${timestamp}@test.com`,
          password: 'Password123!',
          firstName: 'Admin1',
          lastName: 'RoleTest',
        }
      );
      org1UserId = org1Admin.id;

      const org2Admin = await userFactory.createOrgAdmin(
        org2Id,
        `Org2-RoleTest-${timestamp}`,
        org2AdminRole.id,
        {
          email: `admin2-roletest-${timestamp}@test.com`,
          password: 'Password123!',
          firstName: 'Admin2',
          lastName: 'RoleTest',
        }
      );
      org2UserId = org2Admin.id;

      // Login both admins
      await apiUsers.login(`admin1-roletest-${timestamp}@test.com`, 'Password123!');
      const token1Response = await apiUsers.getToken(org1Id);
      org1AdminToken = token1Response.body.accessToken;

      await apiUsers.login(`admin2-roletest-${timestamp}@test.com`, 'Password123!');
      const token2Response = await apiUsers.getToken(org2Id);
      org2AdminToken = token2Response.body.accessToken;
    });

    it('should allow org admin to list roles in their organization', async () => {
      const response = await apiUsers.getRoles(org1AdminToken, org1Id);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);

      // Should see their own org's role
      const org1Role = response.body.data.find((r: any) => r.organizationId === org1Id);
      expect(org1Role).toBeDefined();
      expect(org1Role.name).toBe('ORG_ADMIN');
    });

    it('should enforce organization isolation - org1 admin cannot see org2 roles', async () => {
      const response = await apiUsers.getRoles(org1AdminToken, org1Id);

      expect(response.status).toBe(200);

      // Should NOT see org2's roles
      const org2Roles = response.body.data.filter((r: any) => r.organizationId === org2Id);
      expect(org2Roles.length).toBe(0);
    });

    it('should allow org admin to create a custom role', async () => {
      const roleData = {
        name: 'CustomCollector',
        description: 'Custom debt collector role',
      };

      const response = await apiUsers.createRole(org1AdminToken, org1Id, roleData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'CustomCollector',
        description: 'Custom debt collector role',
        organizationId: org1Id,
        isSystemRole: false,
      });

      customRoleId = response.body.id;
      expect(customRoleId).toBeDefined();
    });

    it('should allow org admin to get permissions list', async () => {
      const response = await apiUsers.getPermissions(org1AdminToken, org1Id);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Should have standard permissions
      const userCreatePerm = response.body.data.find((p: any) => p.code === 'users:write');
      expect(userCreatePerm).toBeDefined();
      expect(userCreatePerm).toMatchObject({
        code: 'users:write',
        resource: 'users',
        action: 'write',
      });
    });

    it('should allow org admin to assign permissions to custom role', async () => {
      // First get permissions to find the IDs we need
      const permsResponse = await apiUsers.getPermissions(org1AdminToken, org1Id);
      const permissions = permsResponse.body.data;

      const debtReadPerm = permissions.find((p: any) => p.code === 'debts:read');
      const debtUpdatePerm = permissions.find((p: any) => p.code === 'debts:write');

      expect(debtReadPerm).toBeDefined();
      expect(debtUpdatePerm).toBeDefined();

      // Assign permissions to the custom role
      const response = await apiUsers.withAuth(org1AdminToken).post(
        `/organizations/${org1Id}/rbac/roles/${customRoleId}/permissions`,
        { permissionId: debtReadPerm.id }
      );

      expect(response.status).toBe(201);

      const response2 = await apiUsers.withAuth(org1AdminToken).post(
        `/organizations/${org1Id}/rbac/roles/${customRoleId}/permissions`,
        { permissionId: debtUpdatePerm.id }
      );

      expect(response2.status).toBe(201);
    });

    it('should reflect permission changes when fetching role details', async () => {
      const response = await apiUsers.getRole(org1AdminToken, org1Id, customRoleId);

      expect(response.status).toBe(200);
      expect(response.body.permissions).toBeDefined();
      expect(response.body.permissions.length).toBe(2);

      const permissionCodes = response.body.permissions.map((p: any) => p.code);
      expect(permissionCodes).toContain('debts:read');
      expect(permissionCodes).toContain('debts:write');
    });

    it('should allow org admin to create a user and assign the custom role', async () => {
      const userData = {
        email: `collector-${Date.now()}@test.com`,
        firstName: 'Test',
        lastName: 'Collector',
        roleId: customRoleId,
      };

      const response = await apiUsers.withAuth(org1AdminToken).post(
        `/organizations/${org1Id}/users`,
        userData
      );

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('PENDING');

      customRoleUserId = response.body.id;

      // Assign the custom role
      const assignResponse = await apiUsers.withAuth(org1AdminToken).post(
        `/organizations/${org1Id}/rbac/users/${customRoleUserId}/roles`,
        { roleId: customRoleId }
      );

      expect(assignResponse.status).toBe(201);
    });

    it('should deny org admin from modifying roles in another organization', async () => {
      // Org1 admin tries to create a role for Org2
      const roleData = {
        name: 'HackedRole',
        description: 'Attempt to create role in org2',
        organizationId: org2Id, 
      };

      const response = await apiUsers.createRole(org1AdminToken, org1Id, roleData);

      // NestJS validation rejects unknown property organizationId with 400
      expect(response.status).toBe(400);
    });

    it('should allow org admin to update custom role name and description', async () => {
      const updates = {
        name: 'UpdatedCollector',
        description: 'Updated description for collector role',
      };

      const response = await apiUsers.patchRole(org1AdminToken, org1Id, customRoleId, updates);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: customRoleId,
        name: 'UpdatedCollector',
        description: 'Updated description for collector role',
      });
    });

    it('should allow org admin to remove permissions from a role', async () => {
      const roleResponse = await apiUsers.getRole(org1AdminToken, org1Id, customRoleId);
      const permissions = roleResponse.body.permissions;

      const debtUpdatePerm = permissions.find((p: any) => p.code === 'debts:write');
      expect(debtUpdatePerm).toBeDefined();

      // Remove debt:update permission
      const response = await apiUsers.withAuth(org1AdminToken).delete(
        `/organizations/${org1Id}/rbac/roles/${customRoleId}/permissions/${debtUpdatePerm.id}`
      );

      expect(response.status).toBe(204);

      // Verify permission was removed
      const updatedRoleResponse = await apiUsers.getRole(org1AdminToken, org1Id, customRoleId);
      const updatedPermissions = updatedRoleResponse.body.permissions;

      const permissionCodes = updatedPermissions.map((p: any) => p.code);
      expect(permissionCodes).not.toContain('debts:write');
      expect(permissionCodes).toContain('debts:read');
    });

    it('should prevent deletion of system roles', async () => {
      const response = await apiUsers.deleteRole(org1AdminToken, org1Id, org1AdminRoleId);

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/system role/i);
    });

    it('should allow deletion of custom roles', async () => {
      // Reassign user back to admin role
      await apiUsers.withAuth(org1AdminToken).post(
        `/organizations/${org1Id}/rbac/users/${customRoleUserId}/roles`,
        { roleId: org1AdminRoleId }
      );

      // Now delete the custom role
      const response = await apiUsers.deleteRole(org1AdminToken, org1Id, customRoleId);

      expect(response.status).toBe(204);

      // Verify role was deleted
      const getResponse = await apiUsers.getRole(org1AdminToken, org1Id, customRoleId);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Scenario 2: Stable Data Journey (Use pre-seeded roles)', () => {
    let stableOrgId: string;
    let stableAdminToken: string;
    let stableRoleId: string;
    let stableUserId: string;

    beforeAll(async () => {
      const timestamp = Date.now();
      const userFactory = createUserFactory(usersDb.getDataSource());
      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const orgProfileFactory = createOrganizationProfileFactory(orgsDb.getDataSource());

      // Create stable organization
      const org = await orgFactory.createOrganization({
        name: `StableOrg-RoleTest-${timestamp}`,
        status: OrganizationStatus.ACTIVE,
      });
      stableOrgId = org.id;

      await orgProfileFactory.addEmail({
        organizationId: stableOrgId,
        email: `stable-org-${timestamp}@test.com`,
        isPrimary: true,
        emailCategory: EmailCategory.GENERAL,
      });

      // Create stable roles
      const adminRole = await roleFactory.createOrgAdminRole(stableOrgId);
      const viewerRole = await roleFactory.createOrgUserRole(stableOrgId);
      stableRoleId = viewerRole.id;

      // Create users
      const admin = await userFactory.createOrgAdmin(
        stableOrgId,
        `StableOrg-RoleTest-${timestamp}`,
        adminRole.id,
        {
          email: `stable-admin-${timestamp}@test.com`,
          password: 'Password123!',
          firstName: 'Stable',
          lastName: 'Admin',
        }
      );

      const user = await userFactory.createOrgUser(
        stableOrgId,
        `StableOrg-RoleTest-${timestamp}`,
        viewerRole.id,
        {
          email: `stable-user-${timestamp}@test.com`,
          password: 'Password123!',
          firstName: 'Stable',
          lastName: 'User',
        }
      );
      stableUserId = user.id;

      // Login admin
      await apiUsers.login(`stable-admin-${timestamp}@test.com`, 'Password123!');
      const tokenResponse = await apiUsers.getToken(stableOrgId);
      stableAdminToken = tokenResponse.body.accessToken;
    });

    it('should successfully list pre-seeded roles', async () => {
      const response = await apiUsers.getRoles(stableAdminToken, stableOrgId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      const roleNames = response.body.data.map((r: any) => r.name);
      expect(roleNames).toContain('ORG_ADMIN');
      expect(roleNames).toContain('ORG_USER');
    });

    it('should successfully retrieve role details with permissions', async () => {
      const response = await apiUsers.getRole(stableAdminToken, stableOrgId, stableRoleId);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: stableRoleId,
        name: 'ORG_USER',
        organizationId: stableOrgId,
        isSystemRole: true,
      });
    });

    it('should successfully reassign user to a different role', async () => {
      const rolesResponse = await apiUsers.getRoles(stableAdminToken, stableOrgId);
      const adminRole = rolesResponse.body.data.find((r: any) => r.name === 'ORG_ADMIN');
      
      const response = await apiUsers.withAuth(stableAdminToken).post(
        `/organizations/${stableOrgId}/rbac/users/${stableUserId}/roles`,
        { roleId: adminRole.id }
      );

      expect(response.status).toBe(201);

      const userResponse = await apiUsers.getUserById(stableAdminToken, stableOrgId, stableUserId);
      const membership = userResponse.body.memberships.find((m: any) => m.organizationId === stableOrgId);
      expect(membership.role.id).toBe(adminRole.id);
    });

    it('should successfully modify existing role permissions', async () => {
      const permsResponse = await apiUsers.getPermissions(stableAdminToken, stableOrgId);
      const userUpdatePerm = permsResponse.body.data.find((p: any) => p.code === 'users:write');

      const response = await apiUsers.withAuth(stableAdminToken).post(
        `/organizations/${stableOrgId}/rbac/roles/${stableRoleId}/permissions`,
        { permissionId: userUpdatePerm.id }
      );

      expect(response.status).toBe(201);

      const updatedRoleResponse = await apiUsers.getRole(stableAdminToken, stableOrgId, stableRoleId);
      const permissionCodes = updatedRoleResponse.body.permissions.map((p: any) => p.code);
      expect(permissionCodes).toContain('users:write');
    });
  });
});