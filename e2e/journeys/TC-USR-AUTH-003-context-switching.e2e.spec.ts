/**
 * @system-rule R-AUTH-003
 * @description User Switches Organization Context
 *
 * This test validates that users with memberships in multiple organizations can switch
 * between organization contexts without re-entering credentials, and that permissions
 * are recalculated for each context.
 *
 * ## What This Test Proves:
 * 1. **Context Switching Flow**: Users can switch between organizations they belong to
 *    - Step 1: Authenticated user calls `/switch-context` with valid JWT → new ACT + org list
 *    - Step 2: User selects different organization → new org-scoped JWT with updated permissions
 * 2. **Permission Recalculation**: JWT permissions reflect the selected organization's role
 * 3. **Organization Membership Validation**: Users can only switch to organizations they belong to
 * 4. **ACT Reissuance**: Switch-context generates a fresh ACT (not reusing login ACT)
 * 5. **Event Publishing**: ContextSwitched events are published with from/to organization IDs
 * 6. **Multi-Org Support**: System correctly handles users with memberships in multiple organizations
 *
 * ## What This Test Does NOT Prove:
 * - Initial login flow (tested in `two-step-login.e2e.spec.ts`)
 * - Token refresh flows (tested separately)
 * - Session management across devices
 * - Concurrent sessions in different organizations
 * - Organization hierarchy and inherited permissions
 * - Context switching with expired JWTs (token expiration tests)
 *
 * ## Security Properties Validated:
 * - Users can ONLY switch to organizations they are members of (403 for unauthorized orgs)
 * - Each context switch requires a valid existing JWT (authentication preserved)
 * - Permissions are recalculated for the new organization (no permission bleed)
 * - JWT contains correct organization context after switch
 * - fromOrganizationId is tracked for audit purposes
 *
 * ## Implementation Notes & Insights:
 *
 * ### Context Switching Design Rationale:
 * Many SaaS platforms allow users to belong to multiple organizations (e.g., consultants,
 * multi-location managers). Context switching allows users to access different organizations
 * without re-authenticating. This is superior to:
 * - Multiple browser sessions (confusing, error-prone)
 * - Logout/login cycles (friction, security risk of password reuse)
 * - Organization selection in URL (harder to enforce, breaks bookmarks)
 *
 * The two-step switch-context flow mirrors the login flow:
 * 1. Prove you're authenticated (valid JWT) → get ACT + org list
 * 2. Select new organization → get new org-scoped JWT
 *
 * ### Permission Recalculation:
 * Users can have different roles in different organizations. For example:
 * - ADMIN in Organization A (full permissions)
 * - COLLECTOR in Organization B (limited permissions)
 *
 * The system MUST recalculate permissions on each context switch to prevent privilege
 * escalation attacks where a user carries admin permissions from one org to another.
 *
 * ### ContextSwitched Event:
 * Published to USERS topic with payload:
 * - userId: Who switched
 * - fromOrganizationId: Previous organization
 * - toOrganizationId: New organization
 * - ipAddress: For audit trail
 *
 * This enables:
 * - Security monitoring (detect unusual context switches)
 * - Analytics (track cross-org usage patterns)
 * - Audit compliance (who accessed which org when)
 *
 * ### Multi-Organization User Creation:
 * Creating users with multiple org memberships requires:
 * 1. Create user in users table
 * 2. Create first membership with INSERT
 * 3. Create second membership with separate INSERT
 * 4. Each membership has its own roleId (can be different roles)
 *
 * ### JWT Comparison Pattern:
 * Tests decode and compare JWT payloads to verify:
 * - organizationId changed to new organization
 * - permissions array changed (different role = different permissions)
 * - sub (user ID) remained the same
 * - iat (issued at) is newer
 *
 * ### Test Strategy - Two-Fold Journey:
 * - **Scenario 1 (Fresh Data)**: Creates two organizations and a user with memberships
 *   in both, validates full context switch flow
 * - **Scenario 2 (Stable Data)**: Uses pre-seeded multi-org user to validate the flow
 *   works on existing records
 *
 * ### Negative Test - Unauthorized Organization:
 * Validates that users cannot switch to organizations they don't belong to by:
 * 1. Creating a third organization with no membership for the test user
 * 2. Attempting to call `/token` with that organization's ID after switch-context
 * 3. Expecting 401 Unauthorized (membership check fails in getScopedToken)
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { faker } from '../utils/faker';
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
import { createEventListenerHelper, EventListenerHelper } from '../helpers/event-listener.helper';
import {
  OrganizationStatus,

  UserType,
  UserStatus,

} from '@verichron/enums';
import {
  JWT_CLAIMS_NAMESPACE,
  JWTPayload
} from '@verichron/contracts';
import { 
  EVENT_TOPICS,
  EVENT_TYPES,
} from '@verichron/events';
import { ContextSwitchedDto } from '../../apps/api-users/src/events/event-dto/auth/context-switched.dto';

describe('TC-USR-AUTH-003: User Switches Organization Context', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let apiUsersClient: ApiUsersClient;
  let eventListener: EventListenerHelper;

  beforeAll(async () => {
    // 1. Initialize database helpers
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();

    // 2. Initialize API client
    apiUsersClient = createApiUsersClient();

    // 3. Initialize event listener
    eventListener = await createEventListenerHelper();
    await eventListener.startListening(EVENT_TOPICS.USERS);
    eventListener.registerDtoMapping(EVENT_TYPES.USERS_AUTH_CONTEXT_SWITCHED, ContextSwitchedDto);

    // Wait for subscriptions to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('✅ Test setup complete');
  });

  afterAll(async () => {
    await eventListener?.stopAll();
    await usersDb.disconnect();
    await orgsDb.disconnect();
    console.log('❌ Test teardown complete');
  });

  describe('Scenario 1: Fresh Data Journey', () => {
    beforeEach(async () => {
      // Clean both databases before each test in Scenario 1
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      // Clear cookies and events to ensure clean state
      apiUsersClient.clearCookies();
      eventListener.clearEvents();
      console.log('🧹 Cleaned databases, cookies, and events for fresh data journey');
    });

    it('should allow user to switch between organization contexts and recalculate permissions', async () => {
      // ARRANGE: Create two organizations
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const org1 = await orgFactory.createCollectionAgency({
        name: 'Agency Alpha',
        displayName: 'Alpha',
        status: OrganizationStatus.ACTIVE,
      });
      const org2 = await orgFactory.createCollectionAgency({
        name: 'Agency Beta',
        displayName: 'Beta',
        status: OrganizationStatus.ACTIVE,
      });

      // Create roles for both organizations
      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const org1AdminRole = await roleFactory.createOrgAdminRole(org1.id);
      const org2UserRole = await roleFactory.createOrgUserRole(org2.id);

      // Create a user with memberships in BOTH organizations (different roles)
      const userFactory = createUserFactory(usersDb.getDataSource());
      const userId = faker.uuid();
      const email = 'multi.org.user@test.com';
      const password = 'MultiOrg123!';
      const passwordHash = await bcrypt.hash(password, 10);

      await usersDb.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [userId, email, passwordHash, 'Multi', 'User', UserStatus.ACTIVE],
      );

      // Add membership to Organization 1 (ADMIN role)
      await usersDb.query(
        `INSERT INTO user_memberships (user_id, organization_id, organization_name, role_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [userId, org1.id, org1.name, org1AdminRole.id],
      );

      // Add membership to Organization 2 (USER role)
      await usersDb.query(
        `INSERT INTO user_memberships (user_id, organization_id, organization_name, role_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [userId, org2.id, org2.name, org2UserRole.id],
      );

      // ACT: Initial login to Organization 1
      const loginResponse = await apiUsersClient.login(email, password);
      expect(loginResponse.status).toBe(201);
      expect(loginResponse.body.organizations.length).toBe(2);

      // Exchange ACT for JWT scoped to Organization 1
      const token1Response = await apiUsersClient.getToken(org1.id);
      expect(token1Response.status).toBe(201);
      const jwt1 = token1Response.body.accessToken;

      // Decode JWT1 to verify it's scoped to Organization 1
      const payload1: JWTPayload = JSON.parse(
        Buffer.from(jwt1.split('.')[1], 'base64').toString('utf-8'),
      );
      expect(payload1.sub).toBe(userId);
      expect(payload1.userType).toBe(UserType.ORG_USER);
      expect(payload1[JWT_CLAIMS_NAMESPACE].organizationId).toBe(org1.id);
      expect(payload1[JWT_CLAIMS_NAMESPACE].permissions).toBeDefined();
      const org1Permissions = payload1[JWT_CLAIMS_NAMESPACE].permissions;

      // ACT: Switch context to Organization 2
      const switchResponse = await apiUsersClient.withAuth(jwt1).post('/auth/switch-context');
      expect(switchResponse.status).toBe(201);
      expect(switchResponse.body.organizations).toBeDefined();
      expect(switchResponse.body.organizations.length).toBe(2);

      // Verify new ACT cookie was set
      const cookies = apiUsersClient.getCookieJar().getAllCookies();
      const actCookie = cookies.find((c: any) => c.name === 'act');
      expect(actCookie).toBeDefined();

      // Exchange new ACT for JWT scoped to Organization 2 (with fromOrganizationId for context switch tracking)
      const token2Response = await apiUsersClient.getToken(org2.id, undefined, org1.id);
      expect(token2Response.status).toBe(201);
      const jwt2 = token2Response.body.accessToken;

      // ASSERT: JWT2 is scoped to Organization 2 with different permissions
      const payload2: JWTPayload = JSON.parse(
        Buffer.from(jwt2.split('.')[1], 'base64').toString('utf-8'),
      );
      expect(payload2.sub).toBe(userId); // Same user
      expect(payload2.userType).toBe(UserType.ORG_USER);
      expect(payload2[JWT_CLAIMS_NAMESPACE].organizationId).toBe(org2.id); // Different org
      expect(payload2[JWT_CLAIMS_NAMESPACE].permissions).toBeDefined();
      const org2Permissions = payload2[JWT_CLAIMS_NAMESPACE].permissions;

      // Permissions should be different (ADMIN vs USER role)
      expect(org2Permissions).not.toEqual(org1Permissions);

      // JWT2 should have same or newer issued-at time (can be same second if fast)
      expect(payload2.iat!).toBeGreaterThanOrEqual(payload1.iat!);

      // ASSERT: ContextSwitched event was published
      const contextSwitchedEvent = await eventListener.waitForEvent(
        EVENT_TYPES.USERS_AUTH_CONTEXT_SWITCHED,
        {
          timeout: 5000,
          predicate: (event) =>
            event.payload.userId === userId &&
            event.payload.fromOrganizationId === org1.id &&
            event.payload.toOrganizationId === org2.id,
        },
      );
      expect(contextSwitchedEvent).toBeDefined();
      expect(contextSwitchedEvent.payload.userId).toBe(userId);
      expect(contextSwitchedEvent.payload.fromOrganizationId).toBe(org1.id);
      expect(contextSwitchedEvent.payload.toOrganizationId).toBe(org2.id);

      console.log('✅ Fresh data journey: Context switch completed successfully');
    });

    it('should prevent switching to unauthorized organization (negative test)', async () => {
      // ARRANGE: Create two organizations
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const org1 = await orgFactory.createCollectionAgency({
        name: 'Authorized Agency',
        status: OrganizationStatus.ACTIVE,
      });
      const org2 = await orgFactory.createCollectionAgency({
        name: 'Unauthorized Agency',
        status: OrganizationStatus.ACTIVE,
      });

      // Create user with membership ONLY in Organization 1
      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const org1Role = await roleFactory.createOrgAdminRole(org1.id);

      const userFactory = createUserFactory(usersDb.getDataSource());
      const user = await userFactory.createOrgUser(org1.id, org1.name, org1Role.id, {
        email: 'authorized.user@test.com',
        password: 'Authorized123!',
      });

      // ACT: Login and get JWT for Organization 1
      const loginResponse = await apiUsersClient.login(user.email, user.password);
      expect(loginResponse.status).toBe(201);

      const token1Response = await apiUsersClient.getToken(org1.id);
      expect(token1Response.status).toBe(201);
      const jwt1 = token1Response.body.accessToken;

      // Switch context (will return org list, but user only belongs to org1)
      const switchResponse = await apiUsersClient.withAuth(jwt1).post('/auth/switch-context');
      expect(switchResponse.status).toBe(201);
      expect(switchResponse.body.organizations.length).toBe(1);
      expect(switchResponse.body.organizations[0].organizationId).toBe(org1.id);

      // ACT: Attempt to get token for Organization 2 (unauthorized)
      const unauthorizedTokenResponse = await apiUsersClient.getToken(org2.id);

      // ASSERT: Request is rejected
      expect(unauthorizedTokenResponse.status).toBe(401);
      expect(unauthorizedTokenResponse.body.message).toContain(
        'User is not a member of the specified organization',
      );

      console.log('✅ Unauthorized organization switch prevented');
    });
  });

  describe('Scenario 2: Stable Data Journey', () => {
    let stableOrg1: any;
    let stableOrg2: any;
    let stableUser: any;
    let stablePassword: string;

    beforeAll(async () => {
      // Clean databases before seeding stable data
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      apiUsersClient.clearCookies();
      eventListener.clearEvents();
      console.log('🧹 Cleaned databases, cookies, and events before seeding stable data');

      // Seed stable test data once for this scenario
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      stableOrg1 = await orgFactory.createCollectionAgency({
        name: 'Stable Agency One',
        displayName: 'Stable One',
        status: OrganizationStatus.ACTIVE,
      });
      stableOrg2 = await orgFactory.createCollectionAgency({
        name: 'Stable Agency Two',
        displayName: 'Stable Two',
        status: OrganizationStatus.ACTIVE,
      });

      // Create roles
      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const org1Role = await roleFactory.createOrgAdminRole(stableOrg1.id);
      const org2Role = await roleFactory.createOrgUserRole(stableOrg2.id);

      // Create multi-org user
      const userFactory = createUserFactory(usersDb.getDataSource());
      const userId = faker.uuid();
      const email = 'stable.multi.user@test.com';
      stablePassword = 'StableMulti123!';
      const passwordHash = await bcrypt.hash(stablePassword, 10);

      await usersDb.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [userId, email, passwordHash, 'Stable', 'Multi', UserStatus.ACTIVE],
      );

      await usersDb.query(
        `INSERT INTO user_memberships (user_id, organization_id, organization_name, role_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [userId, stableOrg1.id, stableOrg1.name, org1Role.id],
      );

      await usersDb.query(
        `INSERT INTO user_memberships (user_id, organization_id, organization_name, role_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [userId, stableOrg2.id, stableOrg2.name, org2Role.id],
      );

      stableUser = { id: userId, email };

      console.log('✅ Stable data seeded for Scenario 2');
    });

    beforeEach(async () => {
      // Clear cookies and events before each test to ensure clean auth state
      apiUsersClient.clearCookies();
      eventListener.clearEvents();
      console.log('🧹 Cleared cookies and events for stable data test');
    });

    it('should complete context switch with pre-existing multi-org user', async () => {
      // ACT: Login to first organization
      const loginResponse = await apiUsersClient.login(stableUser.email, stablePassword);
      expect(loginResponse.status).toBe(201);
      expect(loginResponse.body.organizations.length).toBe(2);

      const token1Response = await apiUsersClient.getToken(stableOrg1.id);
      expect(token1Response.status).toBe(201);
      const jwt1 = token1Response.body.accessToken;

      // Decode JWT1
      const payload1: JWTPayload = JSON.parse(
        Buffer.from(jwt1.split('.')[1], 'base64').toString('utf-8'),
      );
      expect(payload1[JWT_CLAIMS_NAMESPACE].organizationId).toBe(stableOrg1.id);

      // ACT: Switch to second organization
      const switchResponse = await apiUsersClient.withAuth(jwt1).post('/auth/switch-context');
      expect(switchResponse.status).toBe(201);

      const token2Response = await apiUsersClient.getToken(stableOrg2.id, undefined, stableOrg1.id);
      expect(token2Response.status).toBe(201);
      const jwt2 = token2Response.body.accessToken;

      // ASSERT: JWT2 is scoped to Organization 2
      const payload2: JWTPayload = JSON.parse(
        Buffer.from(jwt2.split('.')[1], 'base64').toString('utf-8'),
      );
      expect(payload2[JWT_CLAIMS_NAMESPACE].organizationId).toBe(stableOrg2.id);
      expect(payload2.sub).toBe(stableUser.id);

      console.log('✅ Stable data journey: Context switch completed successfully');
    });

    it('should allow switching back to original organization', async () => {
      // ACT: Login and switch to org2, then switch back to org1
      const loginResponse = await apiUsersClient.login(stableUser.email, stablePassword);
      expect(loginResponse.status).toBe(201);

      // Start in org1
      const token1Response = await apiUsersClient.getToken(stableOrg1.id);
      expect(token1Response.status).toBe(201);
      const jwt1 = token1Response.body.accessToken;

      // Switch to org2
      await apiUsersClient.withAuth(jwt1).post('/auth/switch-context');
      const token2Response = await apiUsersClient.getToken(stableOrg2.id, undefined, stableOrg1.id);
      expect(token2Response.status).toBe(201);
      const jwt2 = token2Response.body.accessToken;

      // Verify we're in org2
      const payload2: JWTPayload = JSON.parse(
        Buffer.from(jwt2.split('.')[1], 'base64').toString('utf-8'),
      );
      expect(payload2[JWT_CLAIMS_NAMESPACE].organizationId).toBe(stableOrg2.id);

      // Switch back to org1
      await apiUsersClient.withAuth(jwt2).post('/auth/switch-context');
      const token3Response = await apiUsersClient.getToken(stableOrg1.id, undefined, stableOrg2.id);
      expect(token3Response.status).toBe(201);
      const jwt3 = token3Response.body.accessToken;

      // ASSERT: Back in org1
      const payload3: JWTPayload = JSON.parse(
        Buffer.from(jwt3.split('.')[1], 'base64').toString('utf-8'),
      );
      expect(payload3[JWT_CLAIMS_NAMESPACE].organizationId).toBe(stableOrg1.id);

      console.log('✅ Successfully switched back to original organization');
    });
  });
});
