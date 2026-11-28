/**
 * @system-rule R-EVENT-002
 * @description When an organization's settings are updated, an `OrganizationSettingsUpdated` event must be published.
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
import { OrganizationSettingsUpdatedDto } from '../../apps/api-organizations/src/events/event-dto/organizations/organization-settings-updated.dto';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import { seedCollectionAgency } from '../fixtures/api-organizations/seed/seed';

describe('TC-ORG-SETTINGS-001: Organization Admin Updates Settings - Event Publishing', () => {
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
      EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SETTINGS_UPDATED,
      OrganizationSettingsUpdatedDto,
    );

    // 4. Create and authenticate a reusable platform admin for all tests
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

  // This hook runs before each test, ensuring a clean state.
  beforeEach(async () => {
    // Clean databases, preserving the platform admin user for authentication
    await orgsDb.cleanAllTables();
    await usersDb.query(`DELETE FROM user_memberships WHERE organization_id IS NOT NULL`);
    await usersDb.query(`DELETE FROM user_emails WHERE user_id NOT IN (SELECT user_id FROM user_memberships WHERE organization_id IS NULL)`);
    await usersDb.query(`DELETE FROM users WHERE id NOT IN (SELECT user_id FROM user_memberships WHERE organization_id IS NULL)`);
    await usersDb.query(`DELETE FROM roles WHERE organization_id IS NOT NULL`);

    // Clear any captured events from previous tests
    eventListener.clearEvents();
  });

  /**
   * Defines the core test logic that will be run against different data scenarios.
   */
  const runUpdateSettingsTest = async (getOrgId: () => string) => {
    const orgId = getOrgId();

    // Step 1: PATCH /organizations/{orgId}/settings
    const settingsUpdate = {
      settings: {
        branding: {
          primaryColorHex: '#FF5733',
          logoUrl: 'https://example.com/logo.png',
        },
      },
    };

    const response = await apiOrgsClient.updateSettingsOps(
      platformAdminJwt,
      orgId,
      settingsUpdate,
    );

    expect(response.status).toBe(200);

    // Step 2: Wait for and verify OrganizationSettingsUpdated event
    const event = await eventListener.waitForEvent(
      EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SETTINGS_UPDATED,
      {
        timeout: 5000,
        predicate: (e) => e.payload.organizationId === orgId,
      },
    );

    expect(event).toBeDefined();
    expect(event.eventType).toBe(EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SETTINGS_UPDATED);
    expect(event.payload.organizationId).toBe(orgId);
    expect(event.payload.updatedSettingKeys).toEqual(expect.arrayContaining(['branding']));
    expect(event.payload.updatedBy).toBeDefined();
  };

  /**
   * SCENARIO 1: FRESH DATA
   * This test creates a new organization from scratch and then updates its settings.
   * It validates that the entire process works on newly created data.
   */
  describe('Scenario 1: Fresh Data Journey', () => {
    let freshOrgId: string;

    beforeEach(async () => {
      // Create a new organization specifically for this test run
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const org = await orgFactory.createOrganization({ status: OrganizationStatus.ACTIVE });
      freshOrgId = org.id;
    });

    it('should publish event when settings are updated for a newly created org', async () => {
      await runUpdateSettingsTest(() => freshOrgId);
    });
  });

  /**
   * SCENARIO 2: STABLE DATA
   * This test runs against a pre-existing, stable organization.
   * It validates that the update functionality works correctly on data that already exists in the system.
   */
  describe('Scenario 2: Stable Data Journey', () => {
    let stableOrgId: string;

    beforeEach(async () => { // Changed from beforeAll to beforeEach
      // Seed a stable, named organization once for all tests in this block
      const { organization } = await seedCollectionAgency(orgsDb.getDataSource(), {
        name: 'Stable Test Agency',
        status: OrganizationStatus.ACTIVE,
      });
      stableOrgId = organization.id;
    });

    it('should publish event when settings are updated for a pre-existing org', async () => {
      await runUpdateSettingsTest(() => stableOrgId);
    });
  });
});
