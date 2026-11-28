/**
 * @system-rule R-SEC-001
 * @description The /onboarding endpoint must be restricted to platform administrators only.
 *              Regular organization admins, managers, and collectors cannot provision new organizations.
 *              This prevents unauthorized organization creation and ensures proper governance.
 */

import {
  createApiOrganizationsClient,
  createApiUsersClient,
  ApiOrganizationsClient,
  ApiUsersClient,
} from '../helpers/api-client.helper';
import {
  createOrganizationsDbHelper,
  createUsersDbHelper,
  DatabaseHelper,
} from '../helpers/database.helper';
import { OrganizationType, UserStatus } from '@verichron/enums';
import { onboardAdmin } from '../fixtures/composed/onboard-admin';
import { createRoleFactory } from '../fixtures/api-users/factories/roleFactory';
import { createUserFactory } from '../fixtures/api-users/factories/userFactory';

describe('TC-ORG-ONBOARD-002: Non-Platform Admin Cannot Access Onboarding Endpoint', () => {
  let orgsDb: DatabaseHelper;
  let usersDb: DatabaseHelper;
  let apiOrgsClient: ApiOrganizationsClient;
  let apiUsersClient: ApiUsersClient;

  beforeAll(async () => {
    orgsDb = createOrganizationsDbHelper();
    usersDb = createUsersDbHelper();
    await orgsDb.connect();
    await usersDb.connect();

    apiOrgsClient = createApiOrganizationsClient();
    apiUsersClient = createApiUsersClient();
  });

  afterAll(async () => {
    await orgsDb?.disconnect();
    await usersDb?.disconnect();
  });

  describe('Scenario 1: Fresh Data Journey', () => {
    beforeEach(async () => {
      await orgsDb.cleanAllTables();
      await usersDb.cleanAllTables();
    });

    it('should deny onboarding request from organization admin', async () => {
      // 1. Arrange: Create a new organization with admin user (not platform admin)
      const { organization, admin } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Test Collection Agency',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          adminEmail: 'orgadmin@test.com',
          adminFirstName: 'Org',
          adminLastName: 'Admin',
        },
      );

      // Login as org admin to get JWT
      const loginResponse = await apiUsersClient.login(admin.email, admin.password);
      expect(loginResponse.status).toBe(201);

      const tokenResponse = await apiUsersClient.getToken(organization.id);
      expect(tokenResponse.status).toBe(201);
      const orgAdminJwt = tokenResponse.body.accessToken;

      // 2. Act: Attempt to onboard a new organization using org admin JWT
      const onboardingPayload = {
        organization: {
          name: 'Unauthorized Organization',
          displayName: 'Unauthorized Org',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          taxId: '99-9999999',
        },
        initialAdmin: {
          email: 'admin@unauthorized.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const response = await apiOrgsClient
        .withAuth(orgAdminJwt)
        .post('/onboarding', onboardingPayload);

      // 3. Assert: Request should be denied with 403 Forbidden
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient permissions');

      // 4. Assert: No organization created
      const [orgs] = await orgsDb.getDataSource().query(
        `SELECT id FROM organizations WHERE name = $1`,
        ['Unauthorized Organization'],
      );
      expect(orgs).toBeUndefined();
    });

    it('should deny onboarding request from manager', async () => {
      // 1. Arrange: Create organization with admin, then create manager user
      const { organization, admin } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Test Agency for Manager',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          adminEmail: 'admin@manager-test.com',
          adminFirstName: 'Admin',
          adminLastName: 'User',
        },
      );

      // Create manager role and user directly with factory (simpler for this test)
      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const managerRole = await roleFactory.createRole({
        name: 'ORG_MANAGER',
        description: 'Organization Manager',
        organizationId: organization.id,
        isSystemRole: false,
      });

      const userFactory = createUserFactory(usersDb.getDataSource());
      const manager = await userFactory.createUser({
        email: 'manager@test.com',
        password: 'Manager123!',
        firstName: 'Manager',
        lastName: 'User',
        organizationId: organization.id,
        organizationName: organization.name,
        roleId: managerRole.id,
        status: UserStatus.ACTIVE,
      });

      // Login as manager
      const managerLoginResponse = await apiUsersClient.login(manager.email, manager.password);
      const managerTokenResponse = await apiUsersClient.getToken(organization.id);
      const managerJwt = managerTokenResponse.body.accessToken;

      // 2. Act: Attempt to onboard as manager
      const onboardingPayload = {
        organization: {
          name: 'Manager Attempted Organization',
          displayName: 'Manager Org',
          organizationType: OrganizationType.CREDITOR,
          taxId: '88-8888888',
        },
        initialAdmin: {
          email: 'admin@manager-org.com',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      };

      const response = await apiOrgsClient.withAuth(managerJwt).post('/onboarding', onboardingPayload);

      // 3. Assert: Request denied
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient permissions');

      // 4. Assert: No organization created
      const [orgs] = await orgsDb.getDataSource().query(
        `SELECT id FROM organizations WHERE name = $1`,
        ['Manager Attempted Organization'],
      );
      expect(orgs).toBeUndefined();
    });

    it('should deny onboarding request from collector', async () => {
      // 1. Arrange: Create organization with admin, then create collector user
      const { organization, admin } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Test Agency for Collector',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          adminEmail: 'admin@collector-test.com',
          adminFirstName: 'Admin',
          adminLastName: 'User',
        },
      );

      // Create collector role and user directly with factory (simpler for this test)
      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const collectorRole = await roleFactory.createRole({
        name: 'ORG_AGENT',
        description: 'Organization Agent/Collector',
        organizationId: organization.id,
        isSystemRole: false,
      });

      const userFactory = createUserFactory(usersDb.getDataSource());
      const collector = await userFactory.createUser({
        email: 'collector@test.com',
        password: 'Collector123!',
        firstName: 'Collector',
        lastName: 'User',
        organizationId: organization.id,
        organizationName: organization.name,
        roleId: collectorRole.id,
        status: UserStatus.ACTIVE,
      });

      // Login as collector
      const collectorLoginResponse = await apiUsersClient.login(collector.email, collector.password);
      const collectorTokenResponse = await apiUsersClient.getToken(organization.id);
      const collectorJwt = collectorTokenResponse.body.accessToken;

      // 2. Act: Attempt to onboard as collector
      const onboardingPayload = {
        organization: {
          name: 'Collector Attempted Organization',
          displayName: 'Collector Org',
          organizationType: OrganizationType.PARTNER,
          taxId: '77-7777777',
        },
        initialAdmin: {
          email: 'admin@collector-org.com',
          firstName: 'Bob',
          lastName: 'Jones',
        },
      };

      const response = await apiOrgsClient
        .withAuth(collectorJwt)
        .post('/onboarding', onboardingPayload);

      // 3. Assert: Request denied
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient permissions');

      // 4. Assert: No organization created
      const [orgs] = await orgsDb.getDataSource().query(
        `SELECT id FROM organizations WHERE name = $1`,
        ['Collector Attempted Organization'],
      );
      expect(orgs).toBeUndefined();
    });
  });

  describe('Scenario 2: Stable Data Journey', () => {
    it('should consistently deny non-platform admin access to onboarding', async () => {
      // 1. Arrange: Create pre-existing organization admin
      const { organization, admin } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Stable Test Agency',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          adminEmail: 'stable-admin@test.com',
          adminFirstName: 'Stable',
          adminLastName: 'Admin',
        },
      );

      // Login as org admin
      const loginResponse = await apiUsersClient.login(admin.email, admin.password);
      const tokenResponse = await apiUsersClient.getToken(organization.id);
      const orgAdminJwt = tokenResponse.body.accessToken;

      // 2. Act: Attempt onboarding multiple times with same non-platform admin
      const attempts = await Promise.all([
        apiOrgsClient.withAuth(orgAdminJwt).post('/onboarding', {
          organization: {
            name: 'Attempt 1 Org',
            organizationType: OrganizationType.COLLECTION_AGENCY,
          },
          initialAdmin: {
            email: 'admin1@test.com',
            firstName: 'Admin',
            lastName: 'One',
          },
        }),
        apiOrgsClient.withAuth(orgAdminJwt).post('/onboarding', {
          organization: {
            name: 'Attempt 2 Org',
            organizationType: OrganizationType.CREDITOR,
          },
          initialAdmin: {
            email: 'admin2@test.com',
            firstName: 'Admin',
            lastName: 'Two',
          },
        }),
      ]);

      // 3. Assert: All attempts denied
      expect(attempts[0].status).toBe(403);
      expect(attempts[1].status).toBe(403);

      // 4. Assert: No organizations created
      const [org1] = await orgsDb.getDataSource().query(
        `SELECT id FROM organizations WHERE name = $1`,
        ['Attempt 1 Org'],
      );
      const [org2] = await orgsDb.getDataSource().query(
        `SELECT id FROM organizations WHERE name = $1`,
        ['Attempt 2 Org'],
      );

      expect(org1).toBeUndefined();
      expect(org2).toBeUndefined();
    });
  });
});
