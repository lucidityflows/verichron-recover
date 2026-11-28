/**
 * @system-rule R-EVENT-003
 * @description When an organization's name is changed, an `OrganizationNameChanged` event must be published.
 *
 * @system-rule R-DATA-001
 * @description Changes to an organization's name must be propagated to the denormalized `organization_name`
 *              field in all associated `user_memberships` records.
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
import { createEventListenerHelper, EventListenerHelper } from '../helpers/event-listener.helper';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import { OrganizationStatus } from '@verichron/enums';
import { OrganizationNameChangedDto } from '../../apps/api-organizations/src/events/event-dto/organizations/organization-name-changed.dto';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { createUserFactory } from '../fixtures/api-users/factories/userFactory';
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import { onboardAdmin } from '../fixtures/composed/onboard-admin';

describe('TC-USERS-ORG-NAME-SYNC: api-users Syncs Organization Name Changes', () => {
  let orgsDb: DatabaseHelper;
  let usersDb: DatabaseHelper;
  let apiOrgsClient: ApiOrganizationsClient;
  let apiUsersClient: ApiUsersClient;
  let eventListener: EventListenerHelper;

  let platformAdminJwt: string;

  beforeAll(async () => {
    // 1. Initialize databases
    orgsDb = createOrganizationsDbHelper();
    usersDb = createUsersDbHelper();
    await orgsDb.connect();
    await usersDb.connect();

    // 2. Initialize API clients
    apiOrgsClient = createApiOrganizationsClient();
    apiUsersClient = createApiUsersClient();

    // 3. Initialize event listener
    eventListener = await createEventListenerHelper();
    await eventListener.startListening(EVENT_TOPICS.ORGANIZATIONS);
    eventListener.registerDtoMapping(
      EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_NAME_CHANGED,
      OrganizationNameChangedDto,
    );

    // 4. Create and authenticate a reusable platform admin
    const platformAdmin = await seedPlatformAdmin(usersDb.getDataSource());
    const loginResponse = await apiUsersClient.login(platformAdmin.user.email, platformAdmin.password);
    // Platform admins need to use null/undefined org ID to maintain platform permissions
    const tokenResponse = await apiUsersClient.getToken(null);
    platformAdminJwt = tokenResponse.body.accessToken;

    console.log('✅ Test setup complete');
  }, 60000);

  afterAll(async () => {
    await eventListener?.stopAll();
    await orgsDb.disconnect();
    await usersDb.disconnect();
    console.log('✅ Test teardown complete');
  });

  beforeEach(async () => {
    // Clean databases before each test, preserving the platform admin
    await orgsDb.cleanAllTables();
    await usersDb.query(`DELETE FROM user_memberships WHERE organization_id IS NOT NULL`);
    await usersDb.query(`DELETE FROM user_emails WHERE user_id NOT IN (SELECT user_id FROM user_memberships WHERE organization_id IS NULL)`);
    await usersDb.query(`DELETE FROM users WHERE id NOT IN (SELECT user_id FROM user_memberships WHERE organization_id IS NULL)`);
    await usersDb.query(`DELETE FROM roles WHERE organization_id IS NOT NULL`);
    eventListener.clearEvents();
  });

  const runNameChangeTest = async (getOrgId: () => string, adminId: string, initialName: string, newName: string) => {
    const orgId = getOrgId();

    // Step 1: Update organization name via api-organizations
    const response = await apiOrgsClient.updateOrganizationOps(platformAdminJwt, orgId, { name: newName });

    expect(response.status).toBe(200);

    // Step 2: Verify OrganizationNameChanged event was published
    const event = await eventListener.waitForEvent(
      EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_NAME_CHANGED,
      {
        timeout: 5000,
        predicate: (e) => e.payload.organizationId === orgId,
      },
    );

    expect(event).toBeDefined();
    expect(event.payload.organizationId).toBe(orgId);
    expect(event.payload.previousName).toBe(initialName);
    expect(event.payload.newName).toBe(newName);

    // Step 3: Poll the database to verify the denormalized name was updated in user_memberships
    const userFactory = createUserFactory(usersDb.getDataSource());
    let updatedName: string | null = null;
    for (let i = 0; i < 10; i++) {
      const memberships = await userFactory.getMemberships(adminId);
      const relevantMembership = memberships.find(m => m.organizationId === orgId);
      if (relevantMembership?.organizationName === newName) {
        updatedName = relevantMembership.organizationName;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Step 4: Assert the change
    expect(updatedName).toBe(newName);
    console.log('✅ api-users successfully synced organization name change');
  };

  describe('Scenario 1: Fresh Data Journey', () => {
    let freshOrgId: string;
    let adminId: string;
    const initialName = 'Fresh Org Name';
    const newName = 'Updated Fresh Org';

    beforeEach(async () => {
      const { organization, admin } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: initialName,
          organizationStatus: OrganizationStatus.ACTIVE,
        },
      );
      freshOrgId = organization.id;
      adminId = admin.id;
    });

    it('should sync name change for a newly created organization', async () => {
      await runNameChangeTest(() => freshOrgId, adminId, initialName, newName);
    }, 30000);
  });

  describe('Scenario 2: Stable Data Journey', () => {
    let stableOrgId: string;
    let adminId: string;
    const initialName = 'Stable Test Corp';
    const newName = 'Updated Stable Corp';

    beforeEach(async () => { // Changed from beforeAll to beforeEach
      const { organization, admin } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: initialName,
          organizationStatus: OrganizationStatus.ACTIVE,
        },
      );
      stableOrgId = organization.id;
      adminId = admin.id;
    });

    it('should sync name change for a pre-existing organization', async () => {
      await runNameChangeTest(() => stableOrgId, adminId, initialName, newName);
    }, 30000);
  });
});
