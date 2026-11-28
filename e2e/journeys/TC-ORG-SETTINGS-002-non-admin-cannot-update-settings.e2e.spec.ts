/**
 * @system-rule R-SETTINGS-002
 * @description Non-admin users cannot modify organization settings. Requires orgs:settings:write permission.
 */

import {
  createOrganizationsDbHelper,
  createUsersDbHelper,
  DatabaseHelper,
} from '../helpers/database.helper';
import {
  createApiOrganizationsClient,
  createApiUsersClient,
  ApiOrganizationsClient,
  ApiUsersClient,
} from '../helpers/api-client.helper';
import { OrganizationStatus } from '@verichron/enums';
import { createOrganizationFactory as createOrgFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { createRoleFactory } from '../fixtures/api-users/factories/roleFactory';
import { createUserFactory } from '../fixtures/api-users/factories/userFactory';
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import { ORG_ROLE_TEMPLATES } from '../../apps/api-users/src/rbac/role-templates';

describe('TC-ORG-SETTINGS-002: Non-Admin Cannot Update Settings', () => {
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
  }, 60000);

  afterAll(async () => {
    await orgsDb.disconnect();
    await usersDb.disconnect();
  });

  const runUnauthorizedSettingsUpdateTest = async (
    orgId: string,
    unauthorizedUserEmail: string,
    unauthorizedUserPassword: string,
  ) => {
    // ARRANGE: Unauthorized user logs in
    const loginResponse = await apiUsersClient.login(
      unauthorizedUserEmail,
      unauthorizedUserPassword,
    );
    expect(loginResponse.status).toBe(201);
    const userOrg = loginResponse.body.organizations.find(
      (o: any) => o.organizationId === orgId,
    );
    expect(userOrg).toBeDefined();

    const tokenResponse = await apiUsersClient.getToken(orgId);
    expect(tokenResponse.status).toBe(201);
    const unauthorizedUserJwt = tokenResponse.body.accessToken;

    // ARRANGE: Define settings update payload
    const settingsUpdatePayload = {
      settings: { branding: { primaryColorHex: '#BEEFEE' } },
    };

    // ACT: Unauthorized user attempts to update settings
    const response = await apiOrgsClient.updateSettings(
      unauthorizedUserJwt,
      orgId,
      settingsUpdatePayload,
    );

    // ASSERT: Request denied with 403 Forbidden
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(
      /Forbidden resource|Insufficient permissions|access denied/i,
    );
  };

  describe('Scenario 1: Fresh Data Journey', () => {
    let freshOrgId: string;
    let collectorEmail: string;
    const collectorPassword = 'CollectorPassword123!';

    beforeEach(async () => {
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      apiUsersClient.clearCookies();
      apiOrgsClient.clearCookies();

      const orgFactory = createOrgFactory(orgsDb.getDataSource());
      const org = await orgFactory.createCollectionAgency({
        name: 'Fresh Org for Collector',
        status: OrganizationStatus.ACTIVE,
      });
      freshOrgId = org.id;

      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const userFactory = createUserFactory(usersDb.getDataSource());

      let collectorRole = await roleFactory.findByName('Collector', org.id);
      if (!collectorRole) {
        collectorRole = await roleFactory.createRole({
          ...ORG_ROLE_TEMPLATES.ORG_COLLECTOR,
          organizationId: org.id,
        });
      }
      if (!collectorRole) {
        throw new Error('Test setup failed: Could not create Collector role');
      }

      const collector = await userFactory.createOrgUser(
        org.id,
        org.name,
        collectorRole.id,
        {
          email: 'fresh.collector@test.com',
          password: collectorPassword,
        },
      );
      collectorEmail = collector.email;
    });

    it('should deny Collector user from updating organization settings', async () => {
      await runUnauthorizedSettingsUpdateTest(
        freshOrgId,
        collectorEmail,
        collectorPassword,
      );
    });
  });

  describe('Scenario 2: Stable Data Journey', () => {
    let stableOrgId: string;
    let stableCollectorEmail: string;
    const stableCollectorPassword = 'StableCollector123!';

    beforeAll(async () => {
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();

      const orgFactory = createOrgFactory(orgsDb.getDataSource());
      const organization = await orgFactory.createCollectionAgency({
        name: 'Stable Org for Collector',
        status: OrganizationStatus.ACTIVE,
      });
      stableOrgId = organization.id;

      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const userFactory = createUserFactory(usersDb.getDataSource());

      let collectorRole = await roleFactory.findByName('Collector', organization.id);
      if (!collectorRole) {
        collectorRole = await roleFactory.createRole({
          ...ORG_ROLE_TEMPLATES.ORG_COLLECTOR,
          organizationId: organization.id,
        });
      }
      if (!collectorRole) {
        throw new Error('Test setup failed: Could not create Collector role for stable data');
      }

      const stableCollector = await userFactory.createOrgUser(
        organization.id,
        organization.name,
        collectorRole.id,
        {
          email: 'stable.collector@test.com',
          password: stableCollectorPassword,
        },
      );
      stableCollectorEmail = stableCollector.email;
    });

    beforeEach(() => {
      apiUsersClient.clearCookies();
      apiOrgsClient.clearCookies();
    });

    it('should deny Collector user from updating organization settings with stable data', async () => {
      await runUnauthorizedSettingsUpdateTest(
        stableOrgId,
        stableCollectorEmail,
        stableCollectorPassword,
      );
    });
  });
});