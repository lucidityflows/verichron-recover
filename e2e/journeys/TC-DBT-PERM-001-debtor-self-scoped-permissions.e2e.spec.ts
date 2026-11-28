/**
 * @system-rule R-DEBTOR-PERM-001
 * @description Debtor Permissions Are Self-Scoped Only - Permission Isolation
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
import { seedDebtor } from '../fixtures/api-users/seed/seed';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { JWT_CLAIMS_NAMESPACE } from '@verichron/contracts';
import { OrganizationStatus } from '@verichron/enums';

describe('TC-DBT-PERM-001: Debtor Permissions Are Self-Scoped Only', () => {
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

  describe('Scenario 1: Fresh Data Journey - Permission Isolation', () => {
    let testOrgId: string;
    let debtorAccessToken: string;

    beforeAll(async () => {
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      apiUsersClient.clearCookies();

      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const org = await orgFactory.createCollectionAgency({
        name: `Debtor Permissions Test Org ${Date.now()}`,
        status: OrganizationStatus.ACTIVE,
      });
      testOrgId = org.id;

      const debtor = await seedDebtor(
        usersDb.getDataSource(),
        [testOrgId],
        [org.name],
        {
          email: `debtor.permissions.${Date.now()}@example.com`,
          password: 'DebtorPermissions123!',
        },
      );

      const loginResponse = await apiUsersClient.login(debtor.user.email, debtor.password);
      const tokenResponse = await apiUsersClient.getToken(testOrgId);
      debtorAccessToken = tokenResponse.body.accessToken;
    });

    it('should have ONLY self-scoped permissions in JWT', () => {
      const payload = JSON.parse(Buffer.from(debtorAccessToken.split('.')[1], 'base64').toString('utf-8'));
      const claims = payload[JWT_CLAIMS_NAMESPACE];
      expect(claims.debtorPermissions.every((perm: string) => perm.includes(':self:'))).toBe(true);
    });

    it('should be FORBIDDEN (403) from accessing /users endpoint', async () => {
      // Pass the orgId - auth passes, but debtorPermissions lack org-level 'users:read'
      const response = await apiUsersClient.getUsers(debtorAccessToken, testOrgId);
      expect(response.status).toBe(403);
    });

    it('should be FORBIDDEN (403) from accessing /rbac/roles endpoint', async () => {
      const response = await apiUsersClient.getRoles(debtorAccessToken, testOrgId);
      expect(response.status).toBe(403);
    });

    it('should be FORBIDDEN (403) from accessing /rbac/permissions endpoint', async () => {
      const response = await apiUsersClient.getPermissions(debtorAccessToken, testOrgId);
      expect(response.status).toBe(403);
    });
  });

  describe('Scenario 2: Stable Data Journey - Permission Consistency', () => {
    let stableDebtorToken: string;
    let stableOrgId: string;

    beforeAll(async () => {
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const stableOrg = await orgFactory.createCollectionAgency({
        name: `Stable Org ${Date.now()}`,
        status: OrganizationStatus.ACTIVE,
      });
      stableOrgId = stableOrg.id;

      const stableDebtor = await seedDebtor(
        usersDb.getDataSource(),
        [stableOrgId],
        [stableOrg.name],
        {
          email: `debtor.stable.${Date.now()}@example.com`,
          password: 'StableDebtor123!',
        },
      );

      await apiUsersClient.login(stableDebtor.user.email, stableDebtor.password);
      const tokenResponse = await apiUsersClient.getToken(stableOrgId);
      stableDebtorToken = tokenResponse.body.accessToken;
    });

    it('should consistently block access to multiple org endpoints', async () => {
      const response1 = await apiUsersClient.getUsers(stableDebtorToken, stableOrgId);
      const response2 = await apiUsersClient.getRoles(stableDebtorToken, stableOrgId);
      const response3 = await apiUsersClient.getPermissions(stableDebtorToken, stableOrgId);

      expect(response1.status).toBe(403);
      expect(response2.status).toBe(403);
      expect(response3.status).toBe(403);
    });
  });
});