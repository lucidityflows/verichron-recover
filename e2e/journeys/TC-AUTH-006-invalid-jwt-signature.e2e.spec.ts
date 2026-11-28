/**
 * @system-rule R-AUTH-005
 * @description JWT Signature Validation - Invalid Signatures Must Be Rejected
 */

import {
  createUsersDbHelper,
  createOrganizationsDbHelper,
  DatabaseHelper,
} from '../helpers/database.helper';
import {
  createApiUsersClient,
  ApiUsersClient,
} from '../helpers/api-client.helper';
import { createUserFactory } from '../fixtures/api-users/factories/userFactory';
import { createRoleFactory } from '../fixtures/api-users/factories/roleFactory';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import { OrganizationStatus, OrganizationType } from '@verichron/enums';
import * as jwt from 'jsonwebtoken';

describe('TC-AUTH-006: Invalid JWT Signature Rejected', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let apiUsersClient: ApiUsersClient;

  beforeAll(async () => {
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();
    apiUsersClient = createApiUsersClient();
    console.log('✅ Test setup complete');
  });

  afterAll(async () => {
    await usersDb.disconnect();
    await orgsDb.disconnect();
  });

  describe('Scenario 1: Fresh Data - Invalid Signature Detection', () => {
    let testOrgId: string;
    let testUserId: string;
    let validAccessToken: string;

    beforeAll(async () => {
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      apiUsersClient.clearCookies();

      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const organization = await orgFactory.createOrganization({
        name: `JWT Security Test Org ${Date.now()}`,
        organizationType: OrganizationType.COLLECTION_AGENCY,
        status: OrganizationStatus.ACTIVE,
      });
      testOrgId = organization.id;

      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const role = await roleFactory.createOrgAdminRole(testOrgId);

      const userFactory = createUserFactory(usersDb.getDataSource());
      const userEmail = `jwt-test-${Date.now()}@test.com`;
      const user = await userFactory.createOrgAdmin(testOrgId, organization.name, role.id, {
        email: userEmail,
        password: 'SecurePass123!',
      });
      testUserId = user.id;

      await apiUsersClient.login(userEmail, 'SecurePass123!');
      const cookies = apiUsersClient.getCookieJar().getAllCookies();
      const actCookie = cookies.find((c: any) => c.name === 'act');
      expect(actCookie).toBeDefined();

      const tokenResponse = await apiUsersClient.getToken(testOrgId);
      validAccessToken = tokenResponse.body.accessToken;
    });

    it('should reject JWT signed with wrong secret', async () => {
      const malformedToken = jwt.sign({ sub: testUserId }, 'WRONG_SECRET');
      const response = await apiUsersClient.getUsers(malformedToken, testOrgId);
      expect(response.status).toBe(401);
    });

    it('should accept JWT with valid signature (control test)', async () => {
      const response = await apiUsersClient.getUsers(validAccessToken, testOrgId);
      expect(response.status).toBe(200);
    });
  });

  describe('Scenario 2: Stable Data - Signature Validation on Existing Fixtures', () => {
    const PLATFORM_ADMIN_EMAIL = 'platform.admin@verichron.com';
    const PLATFORM_ADMIN_PASSWORD = 'PlatformAdmin123!';
    let validPlatformToken: string;

    beforeAll(async () => {
      await seedPlatformAdmin(usersDb.getDataSource(), {
        email: PLATFORM_ADMIN_EMAIL,
        password: PLATFORM_ADMIN_PASSWORD,
      });

      await apiUsersClient.login(PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD);
      const tokenResponse = await apiUsersClient.getToken(null);
      validPlatformToken = tokenResponse.body.accessToken;
    });

    it('should reject platform admin token signed with wrong secret', async () => {
      const decoded = jwt.decode(validPlatformToken, { complete: true }) as any;
      const forgedToken = jwt.sign(decoded.payload, 'WRONG_PLATFORM_SECRET');
      const response = await apiUsersClient.switchContext(forgedToken);
      expect(response.status).toBe(401);
    });

    it('should accept valid platform admin token (control test)', async () => {
      const response = await apiUsersClient.switchContext(validPlatformToken);
      expect(response.status).toBe(201);
    });
  });
});