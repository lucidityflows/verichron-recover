/**
 * @system-rule R-AUTH-006
 * @description Missing JWT Authentication - Protected Endpoints Must Reject Unauthenticated Requests
 */

import {
  createUsersDbHelper,
  createOrganizationsDbHelper,
  DatabaseHelper,
} from '../helpers/database.helper';
import {
  createApiUsersClient,
  createApiOrganizationsClient,
  ApiUsersClient,
  ApiOrganizationsClient,
} from '../helpers/api-client.helper';
import { createUserFactory } from '../fixtures/api-users/factories/userFactory';
import { createRoleFactory } from '../fixtures/api-users/factories/roleFactory';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import { OrganizationStatus, OrganizationType } from '@verichron/enums';

describe('TC-AUTH-007: Missing JWT Returns 401', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let apiUsersClient: ApiUsersClient;
  let apiOrgsClient: ApiOrganizationsClient;

  beforeAll(async () => {
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();
    apiUsersClient = createApiUsersClient();
    apiOrgsClient = createApiOrganizationsClient();
    console.log('✅ Test setup complete');
  }, 60000);

  afterAll(async () => {
    await usersDb.disconnect();
    await orgsDb.disconnect();
  });

  describe('Scenario 1: Fresh Data - Missing JWT on Organization User Endpoints', () => {
    let testOrgId: string;
    let validAccessToken: string;

    beforeAll(async () => {
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      apiUsersClient.clearCookies();

      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const organization = await orgFactory.createOrganization({
        name: `Auth Test Org ${Date.now()}`,
        organizationType: OrganizationType.COLLECTION_AGENCY,
        status: OrganizationStatus.ACTIVE,
      });
      testOrgId = organization.id;

      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const role = await roleFactory.createOrgAdminRole(testOrgId);

      const userFactory = createUserFactory(usersDb.getDataSource());
      const userEmail = `auth-test-${Date.now()}@test.com`;
      const userPassword = 'SecurePass123!';
      await userFactory.createOrgAdmin(testOrgId, organization.name, role.id, {
        email: userEmail,
        password: userPassword,
      });

      await apiUsersClient.login(userEmail, userPassword);
      const tokenResponse = await apiUsersClient.getToken(testOrgId);
      validAccessToken = tokenResponse.body.accessToken;
    });

    it('should reject request with no Authorization header', async () => {
      // Use low-level get to test missing header
      const response = await apiUsersClient.get(`/organizations/${testOrgId}/users`);
      expect(response.status).toBe(401);
    });

    it('should reject request with empty Authorization header', async () => {
      const response = await apiUsersClient.withHeaders({
        Authorization: '',
      }).get(`/organizations/${testOrgId}/users`);
      expect(response.status).toBe(401);
    });

    it('should reject request with malformed Bearer format', async () => {
      const response = await apiUsersClient.withHeaders({
        Authorization: 'Bearer',
      }).get(`/organizations/${testOrgId}/users`);
      expect(response.status).toBe(401);
    });

    it('should accept request with valid JWT (control test)', async () => {
      const response = await apiUsersClient.getUsers(validAccessToken, testOrgId);
      expect(response.status).toBe(200);
    });
  });

  describe('Scenario 2: Stable Data - Missing JWT on Platform Admin Endpoints', () => {
    const PLATFORM_ADMIN_EMAIL = 'platform.admin@verichron.com';
    const PLATFORM_ADMIN_PASSWORD = 'PlatformAdmin123!';
    let validPlatformToken: string;
    let testOrgId: string;

    beforeAll(async () => {
      await seedPlatformAdmin(usersDb.getDataSource(), {
        email: PLATFORM_ADMIN_EMAIL,
        password: PLATFORM_ADMIN_PASSWORD,
      });

      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const organization = await orgFactory.createOrganization({
        name: `Platform Test Org ${Date.now()}`,
        status: OrganizationStatus.ACTIVE,
      });
      testOrgId = organization.id;

      await apiUsersClient.login(PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD);
      const tokenResponse = await apiUsersClient.getToken(null);
      validPlatformToken = tokenResponse.body.accessToken;
    });

    it('should reject platform admin endpoint with no Authorization header', async () => {
      const response = await apiUsersClient.get('/ops/users'); // New path for platform-wide list
      expect(response.status).toBe(401);
    });

    it('should accept platform admin request with valid JWT (control test)', async () => {
      const response = await apiUsersClient.getUsers(validPlatformToken);
      expect(response.status).toBe(200);
    });
  });
});