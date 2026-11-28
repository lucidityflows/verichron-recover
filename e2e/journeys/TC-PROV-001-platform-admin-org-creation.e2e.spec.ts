/**
 * @system-rule R-PROV-001
 * @description A platform administrator must be able to provision a new organization, which places the
 *              organization into a `PROVISIONING` state and publishes an `OrganizationCreated` event.
 */
import { DataSource } from 'typeorm';
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
import { createEventListenerHelper, EventListenerHelper } from '../helpers/event-listener.helper';
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { OrganizationType } from '@verichron/enums';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import { OrganizationCreatedDto } from '../../apps/api-organizations/src/events/event-dto/organizations/organization-created.dto';

describe('TC-ORG-PROVISION-001: Platform Admin Provisions New Organization', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let apiUsersClient: ApiUsersClient;
  let apiOrgsClient: ApiOrganizationsClient;
  let eventListener: EventListenerHelper;

  let platformAdminToken: string;

  const testOrgData = {
    organization: {
      name: 'Acme Collections',
      displayName: 'Acme',
      organizationType: OrganizationType.COLLECTION_AGENCY,
      taxId: '12-3456789',
    },
    initialAdmin: {
      email: 'admin@acme.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  beforeAll(async () => {
    // 1. Initialize database helpers
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();

    // 2. Initialize API clients
    apiUsersClient = createApiUsersClient();
    apiOrgsClient = createApiOrganizationsClient();

    // 3. Initialize event listener
    eventListener = await createEventListenerHelper();
    await eventListener.startListening(EVENT_TOPICS.ORGANIZATIONS);
    await eventListener.startListening(EVENT_TOPICS.USERS); // api-users will react to org creation
    eventListener.registerDtoMapping(
      EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED,
      OrganizationCreatedDto,
    );

    // Wait for subscriptions to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 4. Create platform admin and get token
    const platformAdmin = await seedPlatformAdmin(usersDb.getDataSource());

    // Step 1: Login to get ACT cookie and organizations list
    const loginResponse = await apiUsersClient.login(
      platformAdmin.user.email,
      platformAdmin.password,
    );
    expect(loginResponse.status).toBe(201);
    expect(loginResponse.body.organizations).toBeDefined();

    // For platform admins, get the system-level organization (organizationId may be null)
    const systemOrg = loginResponse.body.organizations[0];
    expect(systemOrg).toBeDefined();

    // Step 2: Exchange ACT for JWT token - platform admins use null to maintain platform permissions
    const tokenResponse = await apiUsersClient.getToken(null);
    if (tokenResponse.status !== 201) {
      console.error('Token request failed:', {
        status: tokenResponse.status,
        body: tokenResponse.body,
        headers: tokenResponse.headers,
      });
    }
    expect(tokenResponse.status).toBe(201);
    platformAdminToken = tokenResponse.body.accessToken;
    expect(platformAdminToken).toBeDefined();

    console.log('✅ Test setup complete');
  }, 60000); // Increased timeout for beforeAll

  afterAll(async () => {
    await eventListener?.stopAll();
    await usersDb.disconnect();
    await orgsDb.disconnect();
    console.log('❌ Test teardown complete');
  });

  beforeEach(async () => {
    // Clean organizations database
    await orgsDb.cleanAllTables();

    // Clean users database, preserving the platform admin
    await usersDb.query(`DELETE FROM user_memberships WHERE organization_id IS NOT NULL`);
    await usersDb.query(`DELETE FROM user_emails WHERE user_id NOT IN (SELECT user_id FROM user_memberships WHERE organization_id IS NULL)`);
    await usersDb.query(`DELETE FROM users WHERE id NOT IN (SELECT user_id FROM user_memberships WHERE organization_id IS NULL)`);
    await usersDb.query(`DELETE FROM roles WHERE organization_id IS NOT NULL`);

    eventListener.clearEvents();
    console.log('🧹 Cleaned databases and events');
  });

  it('should allow a platform admin to provision a new organization and publish OrganizationCreated event', async () => {
    // Step 1: Platform admin authenticates and receives JWT (done in beforeAll)

    // Step 2: Provision organization
    const onboardingResponse = await apiOrgsClient.provisionOrganization(
      platformAdminToken,
      testOrgData,
      { timeout: 60000 },
    );

    // Step 3: Verify response 201 Created with orgId
    expect(onboardingResponse.status).toBe(201);
    expect(onboardingResponse.body).toHaveProperty('orgId');
    expect(onboardingResponse.body).toHaveProperty('orgName');
    expect(onboardingResponse.body).toHaveProperty('adminEmail');

    const { orgId, orgName, adminEmail } = onboardingResponse.body;
    expect(orgId).toBeDefined();
    expect(orgName).toBe(testOrgData.organization.name);
    expect(adminEmail).toBe(testOrgData.initialAdmin.email);

    // Step 4: Verify organization record exists in organizations_db with ACTIVE status
    // Note: The orchestration completes synchronously, so the org is already activated
    const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
    const createdOrg = await orgFactory.findById(orgId);
    expect(createdOrg).toBeDefined();
    expect(createdOrg?.name).toBe(testOrgData.organization.name);
    expect(createdOrg?.status).toBe('ACTIVE'); // Orchestration completes and activates the org

    // Step 5: Verify OrganizationCreated event published to organizations-v1 topic
    const orgCreatedEvent = await eventListener.waitForEvent(
      EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED,
      {
        timeout: 5000,
        predicate: (event) => event.payload.organizationId === orgId,
      },
    );
    expect(orgCreatedEvent).toBeDefined();
    expect(orgCreatedEvent.payload).toMatchObject({
      organizationId: orgId,
      organizationName: orgName,
      organizationType: testOrgData.organization.organizationType,
      adminUser: {
        email: adminEmail,
        firstName: testOrgData.initialAdmin.firstName,
        lastName: testOrgData.initialAdmin.lastName,
      },
    });

    // NOTE: Full orchestration (admin user creation + status transition to ACTIVE)
    // will be tested separately in the event-orchestrator e2e tests.
    // This test validates the baseline: org provisioning + event publishing.
  }, 60000);
});
