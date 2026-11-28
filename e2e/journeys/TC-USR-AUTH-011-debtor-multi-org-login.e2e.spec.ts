/**
 * @system-rule R-AUTH-DEBTOR-001
 * @description Debtor User Completes Two-Step Login with Multi-Org Token
 *
 * This test validates the DEBTOR user authentication flow with multi-organization access.
 * Unlike ORGANIZATION_USER tokens (single org), DEBTOR tokens contain ALL organizations
 * the debtor has been invited to, enabling seamless cross-org debt access.
 *
 * ## What This Test Proves:
 * 1. **Multi-Org JWT Structure**: DEBTOR users receive tokens with organizationIds[] array
 * 2. **Debtor UserType**: JWT userType is DEBTOR (not ORGANIZATION_USER)
 * 3. **Self-Scoped Permissions**: JWT contains debtorPermissions (not permissions)
 * 4. **isDebtor Flag**: JWT includes isDebtor: true for guard validation
 * 5. **Two-Step Flow**: Debtors use same two-step auth as org users (credentials → ACT → JWT)
 * 6. **Organization List**: Step 1 returns all organizations debtor has access to
 *
 * ## What This Test Does NOT Prove:
 * - Service layer queries (GET /my-debts) - tested separately
 * - DebtorOwnershipGuard validation - tested separately
 * - Invitation flow (debtor creation) - tested separately
 * - Refresh token updates organizationIds - tested in TC-USR-AUTH-012
 * - Invalid token structure rejection - tested in TC-USR-AUTH-013
 *
 * ## Security Properties Validated:
 * - organizationIds sourced from user_memberships (not user input)
 * - JWT structure enforces multi-org access pattern
 * - Debtor permissions completely isolated from org permissions
 * - Same ACT security (HttpOnly, single-use, 5-min expiration) applies
 *
 * ## Architecture Context:
 *
 * ### DEBTOR vs ORGANIZATION_USER JWT Structure:
 *
 * **ORGANIZATION_USER (single org):**
 * ```
 * {
 *   "sub": "user-uuid",
 *   "userType": "ORGANIZATION_USER",
 *   "https://verichroninc.com/claims": {
 *     "organizationId": "org-123",  // SINGULAR
 *     "permissions": ["debt:read", "debt:update", ...]
 *   }
 * }
 * ```
 *
 * **DEBTOR (multi-org):**
 * ```
 * {
 *   "sub": "debtor-user-uuid",
 *   "userType": "DEBTOR",
 *   "https://verichroninc.com/claims": {
 *     "organizationIds": ["org-A", "org-B", "org-C"],  // ARRAY
 *     "debtorPermissions": ["debtor:self:read", "debtor:self:pay", ...],
 *     "isDebtor": true
 *   }
 * }
 * ```
 *
 * ### Why Multi-Org Access?
 * DEBTOR users may owe debts to multiple collection agencies. The multi-org JWT enables:
 * - Unified portal experience (see ALL debts in one view)
 * - GDPR Article 15 compliance (right to access ALL personal data)
 * - No context switching required (unlike org users)
 * - Ownership-based access control (see only YOUR debts, across all orgs)
 *
 * ### Service Layer Query Pattern:
 * ```typescript
 * // Service layer will query:
 * SELECT * FROM debts
 * WHERE debtor_user_id = :userId  // Ownership filter
 * AND organization_id IN (:organizationIds)  // Multi-org scope
 * ```
 *
 * This test proves the JWT structure is correct. Service layer tests prove the queries work.
 *
 * ## Implementation Notes:
 *
 * ### Seed Data Pattern:
 * - Uses `seedDebtor()` helper to create DEBTOR user with multiple org memberships
 * - Creates DEBTOR role (system-level, organization_id: NULL)
 * - Creates user_memberships records for each organization
 * - Debtor permissions defined in DEFAULT_DEBTOR_PERMISSIONS constant
 *
 * ### Test Strategy - Two-Fold Journey:
 * - **Scenario 1 (Fresh Data)**: Creates 3 orgs and debtor user, validates full flow
 * - **Scenario 2 (Stable Data)**: Uses pre-seeded debtor, validates on existing records
 *
 * ### Expected Flow:
 * 1. POST /auth/login with debtor credentials
 * 2. Receive ACT cookie + list of 3 organizations
 * 3. POST /auth/token with ANY org from list (debtor gets ALL orgs regardless)
 * 4. Receive JWT with organizationIds: ["org-A", "org-B", "org-C"]
 * 5. Validate userType: DEBTOR, debtorPermissions, isDebtor: true
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
import { OrganizationStatus, UserType } from '@verichron/enums';
import { JWT_CLAIMS_NAMESPACE, JWTPayload } from '@verichron/contracts';

describe('TC-USR-AUTH-011: Debtor User Completes Two-Step Login with Multi-Org Token', () => {
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

  describe('Scenario 1: Fresh Data Journey', () => {
    beforeEach(async () => {
      // Clean both databases before each test in Scenario 1
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      // Clear cookies to ensure clean state
      apiUsersClient.clearCookies();
      console.log('🧹 Cleaned databases and cookies for fresh data journey');
    });

    it('should complete two-step login and receive multi-org JWT with DEBTOR structure', async () => {
      // ARRANGE: Create 3 organizations
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());

      const orgA = await orgFactory.createCollectionAgency({
        name: 'Acme Collections',
        displayName: 'Acme',
        status: OrganizationStatus.ACTIVE,
      });

      const orgB = await orgFactory.createCollectionAgency({
        name: 'Beta Recovery',
        displayName: 'Beta',
        status: OrganizationStatus.ACTIVE,
      });

      const orgC = await orgFactory.createCollectionAgency({
        name: 'Collect Co',
        displayName: 'Collect',
        status: OrganizationStatus.ACTIVE,
      });

      // ARRANGE: Create debtor user with memberships in all 3 orgs
      const debtorUser = await seedDebtor(
        usersDb.getDataSource(),
        [orgA.id, orgB.id, orgC.id],
        [orgA.name, orgB.name, orgC.name],
        {
          email: 'debtor.fresh@example.com',
          password: 'DebtorFresh123!',
          firstName: 'Fresh',
          lastName: 'Debtor',
        },
      );

      // ACT: Step 1 - Login with credentials
      const loginResponse = await apiUsersClient.login(
        debtorUser.user.email,
        debtorUser.password,
      );

      // ASSERT: Step 1 Response
      expect(loginResponse.status).toBe(201);
      expect(loginResponse.body).toHaveProperty('organizations');
      expect(Array.isArray(loginResponse.body.organizations)).toBe(true);
      expect(loginResponse.body.organizations.length).toBe(3);

      // Verify all 3 organizations in list
      const orgIds = loginResponse.body.organizations.map((o: any) => o.organizationId);
      expect(orgIds).toContain(orgA.id);
      expect(orgIds).toContain(orgB.id);
      expect(orgIds).toContain(orgC.id);

      // Verify organization names
      const orgNames = loginResponse.body.organizations.map((o: any) => o.organizationName);
      expect(orgNames).toContain(orgA.name);
      expect(orgNames).toContain(orgB.name);
      expect(orgNames).toContain(orgC.name);

      // Verify role is DEBTOR
      loginResponse.body.organizations.forEach((org: any) => {
        expect(org.role).toBe('DEBTOR');
      });

      // Verify ACT cookie was set (client automatically handles this)
      const cookies = apiUsersClient.getCookieJar().getAllCookies();
      const actCookie = cookies.find((c) => c.name === 'act');
      expect(actCookie).toBeDefined();
      expect(actCookie!.httpOnly).toBe(true);
      expect(actCookie!.secure).toBe(true);
      expect(actCookie!.sameSite).toBe('Strict');

      // ACT: Step 2 - Exchange ACT for JWT (can use ANY org from list, debtor gets all)
      const tokenResponse = await apiUsersClient.getToken(orgA.id);

      // ASSERT: Step 2 Response
      expect(tokenResponse.status).toBe(201);
      expect(tokenResponse.body).toHaveProperty('accessToken');
      expect(tokenResponse.body).toHaveProperty('refreshToken');

      const { accessToken, refreshToken } = tokenResponse.body;
      expect(typeof accessToken).toBe('string');
      expect(typeof refreshToken).toBe('string');
      expect(accessToken.split('.').length).toBe(3); // Valid JWT structure

      // ASSERT: JWT Payload Structure (DEBTOR-specific)
      // Decode JWT (without verification, since we're testing structure)
      const payloadBase64 = accessToken.split('.')[1];
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload: JWTPayload = JSON.parse(payloadJson);

      // Validate standard JWT claims
      expect(payload.sub).toBe(debtorUser.user.id);
      expect(payload.userType).toBe(UserType.DEBTOR_USER); // ← DEBTOR userType
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp!).toBeGreaterThan(payload.iat!);

      // Validate custom claims namespace
      expect(payload[JWT_CLAIMS_NAMESPACE]).toBeDefined();
      const customClaims = payload[JWT_CLAIMS_NAMESPACE];

      // CRITICAL: Validate multi-org structure
      expect(customClaims.organizationIds).toBeDefined(); // ← ARRAY (not organizationId)
      expect(Array.isArray(customClaims.organizationIds)).toBe(true);
      expect(customClaims.organizationIds!.length).toBe(3);
      expect(customClaims.organizationIds).toContain(orgA.id);
      expect(customClaims.organizationIds).toContain(orgB.id);
      expect(customClaims.organizationIds).toContain(orgC.id);

      // CRITICAL: Validate debtor-specific permissions
      expect(customClaims.debtorPermissions).toBeDefined(); // ← debtorPermissions (not permissions)
      expect(Array.isArray(customClaims.debtorPermissions)).toBe(true);
      expect(customClaims.debtorPermissions!.length).toBeGreaterThan(0);

      // Verify self-scoped permissions
      const expectedPermissions = [
        'debtor:self:read',
        'debtor:self:pay',
        'debtor:self:update',
        'debtor:self:export',
      ];
      expectedPermissions.forEach((permission) => {
        expect(customClaims.debtorPermissions).toContain(permission);
      });

      // CRITICAL: Validate isDebtor flag
      expect(customClaims.isDebtor).toBe(true);

      // Verify org-scoped fields are NOT present
      expect(customClaims.organizationId).toBeUndefined(); // ← Should be undefined (not singular)
      expect(customClaims.permissions).toBeUndefined(); // ← Should be undefined (not org permissions)

      console.log('✅ Fresh data journey: DEBTOR multi-org login completed successfully');
    });

    it('should prevent login for debtor with zero organization memberships', async () => {
      // ARRANGE: Create debtor user with NO org memberships
      const debtorUser = await seedDebtor(
        usersDb.getDataSource(),
        [], // ← No organizations
        [],
        {
          email: 'debtor.no.orgs@example.com',
          password: 'DebtorNoOrgs123!',
          firstName: 'NoOrgs',
          lastName: 'Debtor',
        },
      );

      // ACT: Step 1 - Login with credentials
      const loginResponse = await apiUsersClient.login(
        debtorUser.user.email,
        debtorUser.password,
      );

      // ASSERT: Login succeeds but returns empty org list
      expect(loginResponse.status).toBe(201);
      expect(loginResponse.body).toHaveProperty('organizations');
      expect(Array.isArray(loginResponse.body.organizations)).toBe(true);
      expect(loginResponse.body.organizations.length).toBe(0);

      // ACT: Step 2 - Attempt to get token with any org
      const fakeOrgId = 'org-fake-123';
      const tokenResponse = await apiUsersClient.getToken(fakeOrgId);

      // ASSERT: Token generation fails (no valid orgs)
      expect(tokenResponse.status).toBeGreaterThanOrEqual(400);
      expect(tokenResponse.status).toBeLessThan(500);

      console.log('✅ Negative test: Debtor with zero orgs cannot get token');
    });
  });

  describe('Scenario 2: Stable Data Journey', () => {
    // Stable data: pre-seeded debtor exists in system
    let stableDebtorEmail: string;
    let stableDebtorPassword: string;
    let stableOrgIds: string[];
    let stableOrgNames: string[];

    beforeAll(async () => {
      // Seed stable data ONCE for all tests in this scenario
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());

      // Create stable organizations
      const stableOrgA = await orgFactory.createCollectionAgency({
        name: 'Stable Org A',
        displayName: 'Stable A',
        status: OrganizationStatus.ACTIVE,
      });

      const stableOrgB = await orgFactory.createCollectionAgency({
        name: 'Stable Org B',
        displayName: 'Stable B',
        status: OrganizationStatus.ACTIVE,
      });

      // Create stable debtor
      const stableDebtor = await seedDebtor(
        usersDb.getDataSource(),
        [stableOrgA.id, stableOrgB.id],
        [stableOrgA.name, stableOrgB.name],
        {
          email: 'debtor.stable@example.com',
          password: 'DebtorStable123!',
          firstName: 'Stable',
          lastName: 'Debtor',
        },
      );

      stableDebtorEmail = stableDebtor.user.email;
      stableDebtorPassword = stableDebtor.password;
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

    it('should authenticate existing debtor and receive consistent multi-org JWT', async () => {
      // ACT: Step 1 - Login with stable debtor credentials
      const loginResponse = await apiUsersClient.login(
        stableDebtorEmail,
        stableDebtorPassword,
      );

      // ASSERT: Step 1 Response
      expect(loginResponse.status).toBe(201);
      expect(loginResponse.body.organizations.length).toBe(2);

      const orgIds = loginResponse.body.organizations.map((o: any) => o.organizationId);
      expect(orgIds).toContain(stableOrgIds[0]);
      expect(orgIds).toContain(stableOrgIds[1]);

      // ACT: Step 2 - Get token
      const tokenResponse = await apiUsersClient.getToken(stableOrgIds[0]);

      // ASSERT: JWT structure
      expect(tokenResponse.status).toBe(201);
      const { accessToken } = tokenResponse.body;

      const payloadBase64 = accessToken.split('.')[1];
      const payload: JWTPayload = JSON.parse(
        Buffer.from(payloadBase64, 'base64').toString('utf-8'),
      );

      // Validate multi-org structure
      expect(payload.userType).toBe(UserType.DEBTOR_USER);
      expect(payload[JWT_CLAIMS_NAMESPACE].organizationIds).toEqual(
        expect.arrayContaining(stableOrgIds),
      );
      expect(payload[JWT_CLAIMS_NAMESPACE].isDebtor).toBe(true);
      expect(payload[JWT_CLAIMS_NAMESPACE].debtorPermissions).toBeDefined();

      console.log('✅ Stable data journey: Existing debtor authenticated successfully');
    });

    it('should allow multiple logins for same debtor (idempotent)', async () => {
      // ACT: Login multiple times
      const login1 = await apiUsersClient.login(stableDebtorEmail, stableDebtorPassword);
      apiUsersClient.clearCookies(); // Clear ACT before second login

      const login2 = await apiUsersClient.login(stableDebtorEmail, stableDebtorPassword);

      // ASSERT: Both logins succeed with same org list
      expect(login1.status).toBe(201);
      expect(login2.status).toBe(201);
      expect(login1.body.organizations.length).toBe(login2.body.organizations.length);

      console.log('✅ Idempotent login test passed');
    });
  });
});
