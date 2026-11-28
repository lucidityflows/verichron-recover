import { 
  createApiOrganizationsClient, 
  createApiUsersClient, 
  ApiOrganizationsClient, 
  ApiUsersClient 
} from '../helpers/api-client.helper';
import { 
  createOrganizationsDbHelper, 
  createUsersDbHelper, 
  DatabaseHelper 
} from '../helpers/database.helper';
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import { OrganizationType, OrganizationStatus, UserStatus } from '@verichron/enums';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { createUserFactory } from '../fixtures/api-users/factories/userFactory';

interface UserOrganization {
  organizationId: string | null;
  name: string;
  // Add other properties if needed
}

describe('Journey: Full Organization Onboarding', () => {
  let orgsDb: DatabaseHelper;
  let usersDb: DatabaseHelper;
  let apiOrgsClient: ApiOrganizationsClient;
  let apiUsersClient: ApiUsersClient;
  let platformAdminJwt: string;
  let platformAdminUserId: string; // Declare here

  beforeAll(async () => {
    // 1. Initialize database helpers
    orgsDb = createOrganizationsDbHelper();
    usersDb = createUsersDbHelper();
    await orgsDb.connect();
    await usersDb.connect();

    // 2. Initialize API clients
    apiOrgsClient = createApiOrganizationsClient();
    apiUsersClient = createApiUsersClient();

    // 3. Seed a platform admin user to authorize the onboarding request
    const platformAdmin = await seedPlatformAdmin(usersDb.getDataSource());
    platformAdminUserId = platformAdmin.user.id; // Assign here
    const loginResponse = await apiUsersClient.login(platformAdmin.user.email, platformAdmin.password);
        // Platform admins need to use null/undefined org ID to maintain platform permissions
        const tokenResponse = await apiUsersClient.getToken(null);
        platformAdminJwt = tokenResponse.body.accessToken;
    
      }, 60000); // 60s timeout for setup
    
      afterAll(async () => {
        await orgsDb.disconnect();
        await usersDb.disconnect();
      });
    
      beforeEach(async () => {
        // Clean all tables before each test to ensure isolation
        await orgsDb.cleanAllTables();
        // In usersDb, we need to preserve the platform admin, roles, and permissions
        await usersDb.query(`DELETE FROM user_emails WHERE user_id != '${platformAdminUserId}'`);
        await usersDb.query(`DELETE FROM user_memberships WHERE user_id != '${platformAdminUserId}'`);
        await usersDb.query(`DELETE FROM users WHERE id != '${platformAdminUserId}'`);
        await usersDb.query(`DELETE FROM roles WHERE organization_id IS NOT NULL`);
      });
    
      it('should successfully onboard a new organization and its admin user', async () => {
        // 1. Arrange: Define the new organization and admin details
        const newOrgData = {
          organization: {
            name: 'Galactic Empire Exports',
            displayName: 'Galactic Empire',
            organizationType: OrganizationType.CREDITOR,
          },
          initialAdmin: {
            email: 'vader@galactic-empire.com',
            firstName: 'Anakin',
            lastName: 'Skywalker',
          },
        };
    
        // 2. Act: Call the onboarding endpoint as a platform admin
        const response = await apiOrgsClient
          .withAuth(platformAdminJwt)
          .post('/onboarding', newOrgData, { timeout: 90000 });
    
        // 3. Assert: Check the API response
        expect(response.status).toBe(201);
        expect(response.body.orgId).toBeDefined();
        expect(response.body.adminUserId).toBeDefined();
        expect(response.body.orgName).toBe(newOrgData.organization.name);
        expect(response.body.adminEmail).toBe(newOrgData.initialAdmin.email);
        expect(response.body.message).toBe('Organization successfully provisioned and activated');
    
        const { orgId, adminUserId } = response.body;

        // 4. Assert: Verify the final state in the organizations database
        const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
        const newOrg = await orgFactory.findById(orgId);

        expect(newOrg).toBeDefined();
        expect(newOrg!.name).toBe(newOrgData.organization.name);
        expect(newOrg!.status).toBe(OrganizationStatus.ACTIVE); // Should be activated by the orchestrator

        // 5. Assert: Verify the final state in the users database
        const userFactory = createUserFactory(usersDb.getDataSource());
        const newAdmin = await userFactory.findById(adminUserId);

        expect(newAdmin).toBeDefined();
        expect(newAdmin!.email).toBe(newOrgData.initialAdmin.email);
        expect(newAdmin!.firstName).toBe(newOrgData.initialAdmin.firstName);
        expect(newAdmin!.lastName).toBe(newOrgData.initialAdmin.lastName);
        expect(newAdmin!.status).toBe(UserStatus.PENDING); // Admin users start as PENDING until they activate their account

        // 6. Assert: Verify membership exists with correct role
        const memberships = await userFactory.getMemberships(adminUserId);
        expect(memberships).toHaveLength(1);
        expect(memberships[0].organizationId).toBe(orgId);
        expect(memberships[0].organizationName).toBe(newOrgData.organization.name);

        // Get role name to verify it's ORG_ADMIN
        const [role] = await usersDb.getDataSource().query(
            `SELECT name FROM roles WHERE id = $1`,
            [memberships[0].roleId]
        );
        expect(role).toBeDefined();
        expect(role.name).toBe('ORGANIZATION_ADMIN');
    
  });
});
