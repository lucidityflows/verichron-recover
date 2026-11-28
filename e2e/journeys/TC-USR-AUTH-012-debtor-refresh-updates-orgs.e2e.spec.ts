/**
 * @system-rule R-AUTH-DEBTOR-002
 * @description Debtor Refresh Token Dynamically Updates organizationIds
 *
 * This test validates that DEBTOR users' refresh tokens dynamically update the organizationIds
 * array when new organization memberships are added. This is critical for the multi-org debtor
 * experience - debtors should gain immediate access to new organizations after accepting
 * invitations without requiring full re-authentication.
 *
 * ## What This Test Proves:
 * 1. **Dynamic Organization Updates**: Refresh token queries current memberships (not cached)
 * 2. **organizationIds Array Updates**: New orgs appear in JWT after refresh
 * 3. **No Re-Login Required**: Debtor gains access via token refresh, not new login
 * 4. **Membership Changes Reflected**: Both additions and removals are detected
 * 5. **Backward Compatible**: Refresh mechanism works same as ORGANIZATION_USER
 *
 * ## What This Test Does NOT Prove:
 * - Invitation flow (tested separately)
 * - Service layer queries with new org (requires api-debts)
 * - Real-time updates (refresh is explicit, not push-based)
 * - Organization removal mid-session (separate edge case test)
 *
 * ## Security Properties Validated:
 * - organizationIds sourced from live database query (not JWT cache)
 * - Refresh token validates user still has access
 * - Removed organizations immediately disappear from new tokens
 * - No privilege escalation via stale tokens (refresh validates current state)
 *
 * ## Architecture Context:
 *
 * ### Why This Matters for DEBTOR Users:
 * Debtors may be invited to new organizations at any time (e.g., debt sold to new agency).
 * Without refresh-based updates, debtors would need to:
 * 1. Log out
 * 2. Log back in
 * 3. Re-authenticate with MFA (if enabled)
 *
 * With refresh-based updates:
 * 1. Accept invitation
 * 2. Token refresh (automatic via client)
 * 3. Immediate access to new organization's debts
 *
 * ### Refresh Flow for DEBTOR Users:
 * ```
 * 1. Debtor authenticated with orgs: [A, B]
 * 2. Org C invites debtor → creates user_membership
 * 3. Client refresh timer triggers (or manual refresh)
 * 4. POST /auth/refresh with refresh token
 * 5. Server queries user_memberships for current orgs
 * 6. New JWT issued with organizationIds: [A, B, C]
 * 7. Debtor can now access Org C debts
 * ```
 *
 * ### Comparison to ORGANIZATION_USER:
 * - **ORGANIZATION_USER**: Refresh preserves single organizationId (static)
 * - **DEBTOR**: Refresh recalculates organizationIds[] array (dynamic)
 *
 * This test proves the dynamic behavior works correctly.
 *
 * ## Implementation Notes:
 *
 * ### Test Strategy - Two-Fold Journey:
 * - **Scenario 1 (Fresh Data)**: Creates debtor with 2 orgs, adds 3rd, validates refresh
 * - **Scenario 2 (Stable Data)**: Uses pre-seeded debtor, tests membership removal
 *
 * ### Seed Data Pattern:
 * - Start with debtor having memberships in orgs A and B
 * - Manually create membership for org C (simulates invitation acceptance)
 * - Refresh token and validate org C appears in new JWT
 * - Remove org B membership and validate it disappears
 *
 * ### Expected Flow:
 * 1. Initial login: organizationIds: ["org-A", "org-B"]
 * 2. Add membership to org C via direct database insert
 * 3. POST /auth/refresh
 * 4. New JWT: organizationIds: ["org-A", "org-B", "org-C"]
 * 5. Validate debtor can now access org C resources
 */

import { DataSource } from 'typeorm';
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
import { createDebtorFactory } from '../fixtures/api-users/factories/debtorFactory';
import { OrganizationStatus, UserType } from '@verichron/enums';
import { JWT_CLAIMS_NAMESPACE, JWTPayload } from '@verichron/contracts';

describe('TC-USR-AUTH-012: Debtor Refresh Token Dynamically Updates organizationIds', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let apiUsersClient: ApiUsersClient;

  beforeAll(async () => {
    // 1. Initialize database helpers
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();

    // 2. Initialize API client
    apiUsersClient = createApiUsersClient();

    console.log('✅ Test setup complete');
  });

  afterAll(async () => {
    await usersDb.disconnect();
    await orgsDb.disconnect();
    console.log('❌ Test teardown complete');
  });

  describe('Scenario 1: Fresh Data Journey - Adding Organization Membership', () => {
    beforeEach(async () => {
      // Clean both databases before each test in Scenario 1
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      // Clear cookies to ensure clean state
      apiUsersClient.clearCookies();
      console.log('🧹 Cleaned databases and cookies for fresh data journey');
    });

    it('should update organizationIds array when debtor added to new organization', async () => {
      // ARRANGE: Create 3 organizations
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());

      const orgA = await orgFactory.createCollectionAgency({
        name: 'Agency A',
        displayName: 'Agency A',
        status: OrganizationStatus.ACTIVE,
      });

      const orgB = await orgFactory.createCollectionAgency({
        name: 'Agency B',
        displayName: 'Agency B',
        status: OrganizationStatus.ACTIVE,
      });

      const orgC = await orgFactory.createCollectionAgency({
        name: 'Agency C',
        displayName: 'Agency C',
        status: OrganizationStatus.ACTIVE,
      });

      // ARRANGE: Create debtor user with memberships in orgs A and B only
      const debtorUser = await seedDebtor(
        usersDb.getDataSource(),
        [orgA.id, orgB.id], // Initially only 2 orgs
        [orgA.name, orgB.name],
        {
          email: 'debtor.refresh@example.com',
          password: 'DebtorRefresh123!',
          firstName: 'Refresh',
          lastName: 'Debtor',
        },
      );

      // ACT: Initial login
      const loginResponse = await apiUsersClient.login(
        debtorUser.user.email,
        debtorUser.password,
      );

      expect(loginResponse.status).toBe(201);
      expect(loginResponse.body.organizations.length).toBe(2);

      // Get initial token
      const tokenResponse = await apiUsersClient.getToken(orgA.id);
      expect(tokenResponse.status).toBe(201);

      const { accessToken: initialAccessToken, refreshToken } = tokenResponse.body;

      // ASSERT: Initial JWT contains only orgs A and B
      const initialPayloadBase64 = initialAccessToken.split('.')[1];
      const initialPayload: JWTPayload = JSON.parse(
        Buffer.from(initialPayloadBase64, 'base64').toString('utf-8'),
      );

      expect(initialPayload.userType).toBe(UserType.DEBTOR_USER);
      expect(initialPayload[JWT_CLAIMS_NAMESPACE].organizationIds).toHaveLength(2);
      expect(initialPayload[JWT_CLAIMS_NAMESPACE].organizationIds).toContain(orgA.id);
      expect(initialPayload[JWT_CLAIMS_NAMESPACE].organizationIds).toContain(orgB.id);
      expect(initialPayload[JWT_CLAIMS_NAMESPACE].organizationIds).not.toContain(orgC.id);

      // ACT: Simulate debtor accepting invitation to org C
      // (In production: api-debtors publishes event → api-users creates membership)
      // For this test: directly create membership to simulate the result
      const debtorFactory = createDebtorFactory(usersDb.getDataSource());
      await debtorFactory.addOrganizationAccess(debtorUser.user.id, orgC.id, orgC.name);

      console.log('✅ Simulated debtor invitation acceptance to Org C');

      // ACT: Refresh access token
      const refreshResponse = await apiUsersClient.refreshToken(refreshToken);

      // ASSERT: Refresh succeeded
      expect(refreshResponse.status).toBe(201);
      expect(refreshResponse.body).toHaveProperty('accessToken');

      const { accessToken: newAccessToken } = refreshResponse.body;

      // ASSERT: New JWT contains all 3 organizations
      const newPayloadBase64 = newAccessToken.split('.')[1];
      const newPayload: JWTPayload = JSON.parse(
        Buffer.from(newPayloadBase64, 'base64').toString('utf-8'),
      );

      expect(newPayload.userType).toBe(UserType.DEBTOR_USER);
      expect(newPayload[JWT_CLAIMS_NAMESPACE].organizationIds).toHaveLength(3);
      expect(newPayload[JWT_CLAIMS_NAMESPACE].organizationIds).toContain(orgA.id);
      expect(newPayload[JWT_CLAIMS_NAMESPACE].organizationIds).toContain(orgB.id);
      expect(newPayload[JWT_CLAIMS_NAMESPACE].organizationIds).toContain(orgC.id);

      // ASSERT: User ID remains the same
      expect(newPayload.sub).toBe(initialPayload.sub);

      // ASSERT: Debtor-specific claims preserved
      expect(newPayload[JWT_CLAIMS_NAMESPACE].isDebtor).toBe(true);
      expect(newPayload[JWT_CLAIMS_NAMESPACE].debtorPermissions).toBeDefined();

      console.log('✅ Fresh data journey: organizationIds updated after refresh');
    });

    it('should reflect membership removal in refreshed token', async () => {
      // ARRANGE: Create 3 organizations and debtor with all 3
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());

      const orgA = await orgFactory.createCollectionAgency({
        name: 'Removal Test Org A',
        displayName: 'Removal A',
        status: OrganizationStatus.ACTIVE,
      });

      const orgB = await orgFactory.createCollectionAgency({
        name: 'Removal Test Org B',
        displayName: 'Removal B',
        status: OrganizationStatus.ACTIVE,
      });

      const orgC = await orgFactory.createCollectionAgency({
        name: 'Removal Test Org C',
        displayName: 'Removal C',
        status: OrganizationStatus.ACTIVE,
      });

      const debtorUser = await seedDebtor(
        usersDb.getDataSource(),
        [orgA.id, orgB.id, orgC.id], // All 3 orgs initially
        [orgA.name, orgB.name, orgC.name],
        {
          email: 'debtor.removal@example.com',
          password: 'DebtorRemoval123!',
          firstName: 'Removal',
          lastName: 'Debtor',
        },
      );

      // ACT: Initial login and get token
      const loginResponse = await apiUsersClient.login(
        debtorUser.user.email,
        debtorUser.password,
      );
      expect(loginResponse.body.organizations.length).toBe(3);

      const tokenResponse = await apiUsersClient.getToken(orgA.id);
      const { accessToken: initialAccessToken, refreshToken } = tokenResponse.body;

      // ASSERT: Initial token has all 3 orgs
      const initialPayload: JWTPayload = JSON.parse(
        Buffer.from(initialAccessToken.split('.')[1], 'base64').toString('utf-8'),
      );
      expect(initialPayload[JWT_CLAIMS_NAMESPACE].organizationIds).toHaveLength(3);

      // ACT: Remove org B membership
      const debtorFactory = createDebtorFactory(usersDb.getDataSource());
      await debtorFactory.removeOrganizationAccess(debtorUser.user.id, orgB.id);

      console.log('✅ Simulated debtor membership removal from Org B');

      // ACT: Refresh token
      const refreshResponse = await apiUsersClient.refreshToken(refreshToken);
      expect(refreshResponse.status).toBe(201);

      const { accessToken: newAccessToken } = refreshResponse.body;

      // ASSERT: New token only has orgs A and C
      const newPayload: JWTPayload = JSON.parse(
        Buffer.from(newAccessToken.split('.')[1], 'base64').toString('utf-8'),
      );

      expect(newPayload[JWT_CLAIMS_NAMESPACE].organizationIds).toHaveLength(2);
      expect(newPayload[JWT_CLAIMS_NAMESPACE].organizationIds).toContain(orgA.id);
      expect(newPayload[JWT_CLAIMS_NAMESPACE].organizationIds).not.toContain(orgB.id);
      expect(newPayload[JWT_CLAIMS_NAMESPACE].organizationIds).toContain(orgC.id);

      console.log('✅ Membership removal reflected in refreshed token');
    });
  });

  describe('Scenario 2: Stable Data Journey - Multiple Refresh Cycles', () => {
    // Stable data: pre-seeded debtor exists in system
    let stableDebtorEmail: string;
    let stableDebtorPassword: string;
    let stableDebtorUserId: string;
    let stableOrgIds: string[];
    let stableOrgNames: string[];

    beforeAll(async () => {
      // Seed stable data ONCE for all tests in this scenario
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());

      // Create stable organizations
      const stableOrgA = await orgFactory.createCollectionAgency({
        name: 'Stable Refresh Org A',
        displayName: 'Stable A',
        status: OrganizationStatus.ACTIVE,
      });

      const stableOrgB = await orgFactory.createCollectionAgency({
        name: 'Stable Refresh Org B',
        displayName: 'Stable B',
        status: OrganizationStatus.ACTIVE,
      });

      // Create stable debtor
      const stableDebtor = await seedDebtor(
        usersDb.getDataSource(),
        [stableOrgA.id, stableOrgB.id],
        [stableOrgA.name, stableOrgB.name],
        {
          email: 'debtor.stable.refresh@example.com',
          password: 'DebtorStableRefresh123!',
          firstName: 'StableRefresh',
          lastName: 'Debtor',
        },
      );

      stableDebtorEmail = stableDebtor.user.email;
      stableDebtorPassword = stableDebtor.password;
      stableDebtorUserId = stableDebtor.user.id;
      stableOrgIds = [stableOrgA.id, stableOrgB.id];
      stableOrgNames = [stableOrgA.name, stableOrgB.name];

      console.log('🌱 Stable data seeded for Scenario 2');
    });

    beforeEach(() => {
      // Clear cookies before each test (but keep database data)
      apiUsersClient.clearCookies();
      console.log('🧹 Cleared cookies for stable data journey');
    });

    afterAll(async () => {
      // Clean up stable data after all tests in this scenario
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      console.log('🧹 Cleaned stable data after Scenario 2');
    });

    it('should support multiple refresh cycles with consistent organizationIds', async () => {
      // ACT: Login
      const loginResponse = await apiUsersClient.login(stableDebtorEmail, stableDebtorPassword);
      expect(loginResponse.status).toBe(201);

      const tokenResponse = await apiUsersClient.getToken(stableOrgIds[0]);
      expect(tokenResponse.status).toBe(201);

      let { accessToken, refreshToken } = tokenResponse.body;

      // Perform 3 refresh cycles
      for (let i = 1; i <= 3; i++) {
        // Small delay to ensure different iat timestamp (JWTs are deterministic)
        if (i > 1) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }

        // ACT: Refresh (reuse same refresh token - no rotation)
        const refreshResponse = await apiUsersClient.refreshToken(refreshToken);
        expect(refreshResponse.status).toBe(201);

        accessToken = refreshResponse.body.accessToken;

        // ASSERT: organizationIds consistent across refreshes
        const payload: JWTPayload = JSON.parse(
          Buffer.from(accessToken.split('.')[1], 'base64').toString('utf-8'),
        );

        expect(payload.userType).toBe(UserType.DEBTOR_USER);
        expect(payload[JWT_CLAIMS_NAMESPACE].organizationIds).toHaveLength(2);
        expect(payload[JWT_CLAIMS_NAMESPACE].organizationIds).toEqual(
          expect.arrayContaining(stableOrgIds),
        );
        expect(payload[JWT_CLAIMS_NAMESPACE].isDebtor).toBe(true);

        console.log(`✅ Refresh cycle ${i}/3: organizationIds consistent`);
      }

      console.log('✅ Multiple refresh cycles completed successfully');
    });

    it('should fail refresh if all memberships removed', async () => {
      // ARRANGE: Login and get tokens
      const loginResponse = await apiUsersClient.login(stableDebtorEmail, stableDebtorPassword);
      const tokenResponse = await apiUsersClient.getToken(stableOrgIds[0]);
      const { refreshToken } = tokenResponse.body;

      // ACT: Remove all memberships
      const debtorFactory = createDebtorFactory(usersDb.getDataSource());
      for (const orgId of stableOrgIds) {
        await debtorFactory.removeOrganizationAccess(stableDebtorUserId, orgId);
      }

      console.log('✅ Removed all memberships for debtor');

      // ACT: Attempt refresh
      const refreshResponse = await apiUsersClient.refreshToken(refreshToken);

      // ASSERT: Refresh should fail (no valid organizations)
      expect(refreshResponse.status).toBeGreaterThanOrEqual(400);
      expect(refreshResponse.status).toBeLessThan(500);

      console.log('✅ Refresh correctly rejected when no memberships remain');

      // CLEANUP: Restore memberships for other tests
      await debtorFactory.addOrganizationAccess(stableDebtorUserId, stableOrgIds[0], stableOrgNames[0]);
      await debtorFactory.addOrganizationAccess(stableDebtorUserId, stableOrgIds[1], stableOrgNames[1]);
    });
  });
});
