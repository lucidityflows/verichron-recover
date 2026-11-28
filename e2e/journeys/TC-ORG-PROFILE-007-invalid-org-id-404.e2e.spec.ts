/**
 * @system-rule R-SEC-002
 * @description Invalid Organization ID Returns 404 - Error Handling
 *
 * This test validates that API endpoints properly handle requests with non-existent
 * organization IDs by returning 404 Not Found responses. This is critical for:
 * 1. Security: Prevents information disclosure about which org IDs exist
 * 2. User Experience: Clear error responses for invalid references
 * 3. Data Integrity: Ensures all org references are validated
 *
 * ## What This Test Proves:
 * 1. **404 Response**: Non-existent org IDs return proper 404 status
 * 2. **Error Messages**: Clear, actionable error messages returned
 * 3. **Cross-Endpoint Consistency**: All org endpoints validate IDs consistently
 * 4. **Security**: No information disclosure about existing vs non-existing orgs
 *
 * ## Test Strategy - Two-Fold Journey:
 * - **Scenario 1 (Fresh Data)**: Create org, delete it, verify 404
 * - **Scenario 2 (Stable Data)**: Use known non-existent UUIDs
 */

import {
  createUsersDbHelper,
  createOrganizationsDbHelper,
  DatabaseHelper,
} from '../helpers/database.helper';
import {
  ApiUsersClient,
  ApiOrganizationsClient,
  createApiUsersClient,
  createApiOrganizationsClient,
} from '../helpers/api-client.helper';
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { OrganizationStatus } from '@verichron/enums';

describe('TC-ORG-PROFILE-007: Invalid Organization ID Returns 404', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let apiUsersClient: ApiUsersClient;
  let apiOrganizationsClient: ApiOrganizationsClient;
  let platformAdminJwt: string;

  beforeAll(async () => {
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();

    apiUsersClient = createApiUsersClient();
    apiOrganizationsClient = createApiOrganizationsClient();

    // Seed platform admin for authenticated requests
    await usersDb.cleanAllTables();
    await orgsDb.cleanAllTables();

    const platformAdmin = await seedPlatformAdmin(usersDb.getDataSource());
    const loginResponse = await apiUsersClient.login(
      platformAdmin.user.email,
      platformAdmin.password,
    );
    const platformOrg = loginResponse.body.organizations.find((o: any) => o.organizationId === null);
    if (!platformOrg) {
      throw new Error('Platform admin login did not yield a platform-level organization context.');
    }
    const tokenResponse = await apiUsersClient.getToken(platformOrg.organizationId);
    platformAdminJwt = tokenResponse.body.accessToken;

    console.log('✅ Test setup complete');
  });

  afterAll(async () => {
    await usersDb.disconnect();
    await orgsDb.disconnect();
    console.log('❌ Test teardown complete');
  });

  describe('Scenario 1: Fresh Data Journey - Deleted Organization Returns 404', () => {
    it('should return 404 when fetching deleted organization', async () => {
      // ARRANGE: Create an organization
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const org = await orgFactory.createCollectionAgency({
        name: 'Temporary Org',
        status: OrganizationStatus.ACTIVE,
      });

      const orgId = org.id;

      // Verify org exists first
      const existsResponse = await apiOrganizationsClient.getOrganizationOps(
        platformAdminJwt,
        orgId,
      );
      expect(existsResponse.status).toBe(200);
      console.log('✅ Organization created and verified to exist');

      // ACT: Delete the organization
      await orgsDb.query(`DELETE FROM organizations WHERE id = '${orgId}'`);
      console.log('✅ Organization deleted from database');

      // ASSERT: Attempt to fetch deleted org returns 404
      const response = await apiOrganizationsClient.getOrganizationOps(
        platformAdminJwt,
        orgId,
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/not found|does not exist/i);
      expect(response.body.statusCode).toBe(404);

      console.log(`✅ Deleted organization returned 404: ${response.body.message}`);
    });

    it('should return 404 when updating non-existent organization', async () => {
      // ARRANGE: Use non-existent org ID
      const nonExistentOrgId = '00000000-0000-0000-0000-000000000001';

      // ACT: Attempt to update non-existent org
      const response = await apiOrganizationsClient.updateOrganizationOps(
        platformAdminJwt,
        nonExistentOrgId,
        { displayName: 'Updated Name' },
      );

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/not found|does not exist/i);

      console.log(`✅ Update non-existent org returned 404: ${response.body.message}`);
    });
  });

  describe('Scenario 2: Stable Data Journey - Known Non-Existent UUIDs', () => {
    const nonExistentOrgIds = [
      '00000000-0000-0000-0000-000000000001',
      '99999999-9999-9999-9999-999999999999',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    ];

    it('should return 404 for GET /orgs/:id with non-existent IDs', async () => {
      for (const orgId of nonExistentOrgIds) {
        const response = await apiOrganizationsClient.getOrganizationOps(
          platformAdminJwt,
          orgId,
        );

        expect(response.status).toBe(404);
        expect(response.body.message).toMatch(/not found|does not exist/i);

        console.log(`✅ GET /orgs/${orgId.substring(0, 8)}... returned 404`);
      }
    });

    it('should return 404 for PATCH /orgs/:id with non-existent IDs', async () => {
      for (const orgId of nonExistentOrgIds) {
        const response = await apiOrganizationsClient.updateOrganizationOps(
          platformAdminJwt,
          orgId,
          { displayName: 'Should Not Update' },
        );

        expect(response.status).toBe(404);
        expect(response.body.message).toMatch(/not found|does not exist/i);

        console.log(`✅ PATCH /orgs/${orgId.substring(0, 8)}... returned 404`);
      }
    });

    it('should return 404 for DELETE /orgs/:id with non-existent IDs', async () => {
      for (const orgId of nonExistentOrgIds) {
        const response = await apiOrganizationsClient.deleteOrganizationOps(
          platformAdminJwt,
          orgId,
        );

        expect(response.status).toBe(404);
        expect(response.body.message).toMatch(/not found|does not exist/i);

        console.log(`✅ DELETE /orgs/${orgId.substring(0, 8)}... returned 404`);
      }
    });

    it('should not disclose whether org exists through error messages', async () => {
      // ARRANGE: Create one org, use one non-existent ID
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const existingOrg = await orgFactory.createCollectionAgency({
        name: 'Existing Org',
        status: OrganizationStatus.ACTIVE,
      });

      const nonExistentOrgId = '00000000-0000-0000-0000-000000000002';

      // ACT: Get error messages for both
      const existingResponse = await apiOrganizationsClient.getOrganizationOps(
        platformAdminJwt,
        existingOrg.id,
      );

      const nonExistentResponse = await apiOrganizationsClient.getOrganizationOps(
        platformAdminJwt,
        nonExistentOrgId,
      );

      // ASSERT: Existing org returns 200, non-existent returns 404
      expect(existingResponse.status).toBe(200);
      expect(nonExistentResponse.status).toBe(404);

      // Error message should NOT reveal if ID was valid UUID format vs random
      expect(nonExistentResponse.body.message).toMatch(/not found|does not exist/i);
      expect(nonExistentResponse.body.message).not.toMatch(/invalid|malformed|format/i);

      console.log('✅ Error messages do not disclose org existence details');

      // Cleanup
      await orgsDb.query(`DELETE FROM organizations WHERE id = '${existingOrg.id}'`);
    });
  });
});
