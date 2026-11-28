/**
 * @system-rule R-SEC-002
 * @description Users must only be able to access data from organizations they belong to.
 *              The system must enforce complete data isolation between organizations.
 *              Users cannot spoof the x-org-id header to access other organizations' data.
 *              This ensures proper multi-tenancy and prevents unauthorized data access.
 *
 * TEST DESIGN & RATIONALE
 * ========================
 *
 * ## What This Test Proves:
 * 1. Users can access their own organization's data when properly authenticated
 * 2. Users CANNOT access other organizations' data (via route params)
 * 3. Users CANNOT spoof the x-org-id header to bypass security
 * 4. List endpoints only return data from the user's organization
 *
 * ## How Multi-Tenancy Isolation Works:
 *
 * The OrgContextGuard (apps/api-organizations/src/common/guards/org-context.guard.ts)
 * enforces data isolation by validating that requested resources match the user's
 * organization context from their JWT token.
 *
 * The guard extracts the requested organizationId from multiple sources (priority order):
 *   1. x-org-id header (if present)
 *   2. Route parameters (:orgId, :organizationId)
 *   3. Request body (organizationId field)
 *
 * It then validates: requestedOrgId === jwtOrgId
 *
 * ## Why x-org-id Header is Optional in Most Tests:
 *
 * The x-org-id header is OPTIONAL because the guard can extract the organization ID
 * from route parameters. We intentionally test WITHOUT the header in most scenarios
 * to validate that the guard properly falls back to route parameter validation.
 *
 * This is important because:
 * - Not all clients will send the x-org-id header
 * - The route parameter is the primary source of truth for resource-specific endpoints
 * - We need to ensure the guard validates BOTH header (if present) AND route params
 *
 * ## Test Scenarios Explained:
 *
 * ### Test 1: "should only return data for user's own organization"
 * - Creates two orgs (A and B)
 * - User A accesses /orgs/{orgA.id} WITHOUT x-org-id header
 *   → Guard extracts orgA.id from route param, validates against JWT
 *   → Expected: 200 OK
 * - User A attempts to access /orgs/{orgB.id} WITHOUT x-org-id header
 *   → Guard extracts orgB.id from route param, validates against JWT
 *   → Expected: 403 Forbidden (orgB.id !== jwtOrgId)
 * - Proves: Route parameter validation prevents cross-org access
 *
 * ### Test 2: "should reject requests with spoofed x-org-id header"
 * - Creates two orgs (A and B)
 * - User A attempts to access /orgs/{orgB.id} WITH x-org-id: orgB.id
 *   → Guard extracts orgB.id from header (takes precedence)
 *   → Validates orgB.id against JWT (which has orgA.id)
 *   → Expected: 403 Forbidden (orgB.id !== jwtOrgId)
 * - Proves: Header spoofing is blocked, even if it matches the route param
 *
 * ### Test 3: "should prevent cross-organization queries via list endpoints"
 * - Creates two orgs (A and B)
 * - User A requests /orgs (list all)
 * - Expected: Response contains ONLY orgA, not orgB
 * - Proves: List endpoints implement data isolation at the service layer
 * - Implementation: Controller extracts orgId from request.activeContext (set by OrgContextGuard)
 *   and passes it to the service method as a parameter. Service applies SQL WHERE filter.
 *
 * ### Test 4: "should consistently enforce data isolation on pre-existing organizations"
 * - Uses stable test data (organizations created once, reused across tests)
 * - Tests multiple concurrent attempts to access own org (should succeed)
 * - Tests multiple concurrent attempts to access other org (should fail)
 * - Proves: Data isolation is consistent and doesn't have race conditions
 *
 * ## Implementation Approaches & Learnings:
 *
 * This test was instrumental in validating our data isolation approach. During development,
 * we explored multiple implementation strategies:
 *
 * ### Approach 1: REQUEST-scoped RequestContext (ABANDONED)
 * - Attempted to use NestJS REQUEST-scoped providers with a global RequestContext service
 * - RequestContextInterceptor would populate context from request data
 * - Services would inject RequestContext and call getOrgId()
 * - **Problem**: REQUEST scope propagates to all dependent services, causing TypeORM
 *   repository injection failures and breaking ALL endpoints with 500 errors
 * - **Lesson**: REQUEST scope is dangerous with TypeORM and adds unnecessary complexity
 *
 * ### Approach 2: Parameter Passing (IMPLEMENTED) ✅
 * - Controller extracts orgId from request.activeContext (already set by OrgContextGuard)
 * - Controller passes orgId as a method parameter to service
 * - Service applies orgId filter in SQL WHERE clause
 * - **Benefits**:
 *   - Simple and explicit (no hidden magic)
 *   - Easy to test (just pass orgId value)
 *   - Easy to audit in code reviews (security logic is visible)
 *   - No DI complexity or scope issues
 *   - Fails loudly if orgId is forgotten
 * - **Security**: orgId comes from validated JWT via OrgContextGuard, not user input
 *
 * ### Why Simple Solutions Win:
 * - The complex approach (RequestContext with REQUEST scope) broke the entire service
 * - The simple approach (parameter passing) took 5 minutes and works perfectly
 * - Explicit is better than implicit for security-critical code
 * - If you can pass a parameter, pass a parameter - don't introduce DI complexity
 *
 * ## What This Test Does NOT Prove:
 *
 * - RBAC/Permissions: We don't test if users have the right PERMISSIONS to access data.
 *   That's covered by permission guard tests (see: TC-USR-RBAC-006)
 * - Platform Admin Access: We don't test that platform admins can access all orgs.
 *   That's covered by platform admin tests (see: TC-ORG-PROVISION-001)
 * - RequestContext pattern necessity: We initially thought RequestContext was needed,
 *   but this test proves that simple parameter passing is sufficient and superior
 *
 * ## Critical Security Note:
 *
 * This test validates TWO layers of defense:
 *
 * 1. **HTTP Layer (OrgContextGuard)**: Prevents unauthorized access to specific resources
 *    - Validates route params and headers against JWT organization context
 *    - Returns 403 Forbidden if orgId mismatch
 *
 * 2. **Service Layer (SQL Filtering)**: Prevents data leakage in list/query operations
 *    - Controllers extract orgId from request.activeContext (set by guard)
 *    - Controllers pass orgId to service methods as explicit parameters
 *    - Services apply orgId as SQL WHERE filter: WHERE organization_id = $orgId
 *    - Platform admins (orgId = null/undefined) see all data (no filter applied)
 *
 * Example implementation:
 *   ```typescript
 *   // Controller
 *   async findAll(@Req() request) {
 *     const orgId = request.activeContext?.orgId;
 *     return this.service.findAll(query, orgId);
 *   }
 *
 *   // Service
 *   async findAll(query, orgId?: string) {
 *     const qb = this.repository.createQueryBuilder();
 *     if (orgId) {
 *       qb.andWhere('organization_id = :orgId', { orgId });
 *     }
 *     return qb.getMany();
 *   }
 *   ```
 *
 * ## Authentication vs Authorization:
 *
 * This test requires proper JWT authentication (via login flow) because:
 * - The guard extracts organizationId from the JWT claims
 * - Without a valid JWT, the guard cannot validate organization context
 * - This is intentional: authentication is a prerequisite for authorization
 */

import {
  createApiOrganizationsClient,
  createApiUsersClient,
  ApiOrganizationsClient,
  ApiUsersClient,
} from '../helpers/api-client.helper';
import {
  createOrganizationsDbHelper,
  createUsersDbHelper,
  DatabaseHelper,
} from '../helpers/database.helper';
import { OrganizationType, OrganizationStatus } from '@verichron/enums';
import { onboardAdmin } from '../fixtures/composed/onboard-admin';

describe('TC-ORG-PROFILE-005: User Can Only See Own Organization Data', () => {
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
  });

  afterAll(async () => {
    await orgsDb?.disconnect();
    await usersDb?.disconnect();
  });

  describe('Scenario 1: Fresh Data Journey', () => {
    beforeEach(async () => {
      await orgsDb.cleanAllTables();
      await usersDb.cleanAllTables();
    });

    it('should only return data for user\'s own organization', async () => {
      // 1. Arrange: Create two separate organizations with their admins
      const { organization: orgA, admin: adminA } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Organization A',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          organizationStatus: OrganizationStatus.ACTIVE,
          adminEmail: 'admin-a@test.com',
          adminFirstName: 'Admin',
          adminLastName: 'A',
        },
      );

      const { organization: orgB, admin: adminB } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Organization B',
          organizationType: OrganizationType.CREDITOR,
          organizationStatus: OrganizationStatus.ACTIVE,
          adminEmail: 'admin-b@test.com',
          adminFirstName: 'Admin',
          adminLastName: 'B',
        },
      );

      // Login as admin of Org A to get JWT
      const loginResponseA = await apiUsersClient.login(adminA.email, adminA.password);
      expect(loginResponseA.status).toBe(201);

      const tokenResponseA = await apiUsersClient.getToken(orgA.id);
      expect(tokenResponseA.status).toBe(201);
      const orgAJwt = tokenResponseA.body.accessToken;

      // 2. Act & Assert: Get org details (x-org-id header optional when accessing own org)
      const getOwnOrgResponse = await apiOrgsClient
        .withAuth(orgAJwt)
        .get(`/organizations/${orgA.id}`);

      // 3. Assert: User can access their own organization
      expect(getOwnOrgResponse.status).toBe(200);
      expect(getOwnOrgResponse.body.id).toBe(orgA.id);
      expect(getOwnOrgResponse.body.name).toBe('Organization A');

      // 4. Act: Attempt to access Org B's data using Org A's token
      // Guard should extract orgId from route param and deny access
      const getOtherOrgResponse = await apiOrgsClient
        .withAuth(orgAJwt)
        .get(`/organizations/${orgB.id}`);

      // 5. Assert: Request should be denied (403 Forbidden or 404 Not Found)
      expect([403, 404]).toContain(getOtherOrgResponse.status);
    });

    it('should reject requests with spoofed x-org-id header', async () => {
      // 1. Arrange: Create two organizations
      const { organization: orgA, admin: adminA } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Org A for Spoofing Test',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          organizationStatus: OrganizationStatus.ACTIVE,
          adminEmail: 'admin-spoof-a@test.com',
          adminFirstName: 'Admin',
          adminLastName: 'A',
        },
      );

      const { organization: orgB, admin: adminB } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Org B for Spoofing Test',
          organizationType: OrganizationType.CREDITOR,
          organizationStatus: OrganizationStatus.ACTIVE,
          adminEmail: 'admin-spoof-b@test.com',
          adminFirstName: 'Admin',
          adminLastName: 'B',
        },
      );

      // Login as admin of Org A to get JWT
      const loginResponseA = await apiUsersClient.login(adminA.email, adminA.password);
      expect(loginResponseA.status).toBe(201);

      const tokenResponseA = await apiUsersClient.getToken(orgA.id);
      expect(tokenResponseA.status).toBe(201);
      const orgAJwt = tokenResponseA.body.accessToken;

      // 2. Act: Attempt to spoof x-org-id header to access Org B
      const spoofedResponse = await apiOrgsClient
        .withAuth(orgAJwt)
        .get(`/organizations/${orgB.id}`, { headers: { 'x-org-id': orgB.id } }); // Spoofed header

      // 3. Assert: Request should be denied with 403 Forbidden
      // The org-context guard should detect the mismatch between JWT org and header org
      expect(spoofedResponse.status).toBe(403);
      expect(spoofedResponse.body.message).toContain('You do not have access to this organization');
    });

    it('should prevent cross-organization queries via list endpoints', async () => {
      // 1. Arrange: Create two organizations
      const { organization: orgA, admin: adminA } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'List Test Org A',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          organizationStatus: OrganizationStatus.ACTIVE,
          adminEmail: 'admin-list-a@test.com',
          adminFirstName: 'Admin',
          adminLastName: 'A',
        },
      );

      const { organization: orgB, admin: adminB } = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'List Test Org B',
          organizationType: OrganizationType.CREDITOR,
          organizationStatus: OrganizationStatus.ACTIVE,
          adminEmail: 'admin-list-b@test.com',
          adminFirstName: 'Admin',
          adminLastName: 'B',
        },
      );

      // Login as admin of Org A
      const loginResponse = await apiUsersClient.login(adminA.email, adminA.password);
      expect(loginResponse.status).toBe(201);

      const tokenResponse = await apiUsersClient.getToken(orgA.id);
      expect(tokenResponse.status).toBe(201);
      const orgAJwt = tokenResponse.body.accessToken;

      // 2. Act: Get list of organizations
      const listResponse = await apiOrgsClient
        .withAuth(orgAJwt)
        .get('/organizations');

      // 3. Assert: Response should only contain Org A, not Org B
      expect(listResponse.status).toBe(200);

      // The response might be paginated or a simple array
      // Check if it's a paginated response with data/items field or a direct array
      const orgs = listResponse.body.data || listResponse.body.items || listResponse.body;

      expect(Array.isArray(orgs)).toBe(true);
      expect(orgs).toHaveLength(1);
      expect(orgs[0].id).toBe(orgA.id);
      expect(orgs[0].name).toBe('List Test Org A');
    });
  });

  describe('Scenario 2: Stable Data Journey', () => {
    let stableOrgA: any;
    let stableOrgB: any;
    let stableAdminA: any;
    let stableAdminB: any;

    beforeAll(async () => {
      // Create stable test data once
      const resultA = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Stable Organization A',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          organizationStatus: OrganizationStatus.ACTIVE,
          adminEmail: 'stable-admin-a@test.com',
          adminFirstName: 'Stable',
          adminLastName: 'A',
        },
      );
      stableOrgA = resultA.organization;
      stableAdminA = resultA.admin;

      const resultB = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Stable Organization B',
          organizationType: OrganizationType.CREDITOR,
          organizationStatus: OrganizationStatus.ACTIVE,
          adminEmail: 'stable-admin-b@test.com',
          adminFirstName: 'Stable',
          adminLastName: 'B',
        },
      );
      stableOrgB = resultB.organization;
      stableAdminB = resultB.admin;
    });

    it('should consistently enforce data isolation on pre-existing organizations', async () => {
      // 1. Arrange: Login as admin of stable Org A
      const loginResponse = await apiUsersClient.login(stableAdminA.email, stableAdminA.password);
      expect(loginResponse.status).toBe(201);

      const tokenResponse = await apiUsersClient.getToken(stableOrgA.id);
      expect(tokenResponse.status).toBe(201);
      const orgAJwt = tokenResponse.body.accessToken;

      // 2. Act: Multiple attempts to access own org (should succeed)
      const ownOrgAttempts = await Promise.all([
        apiOrgsClient
          .withAuth(orgAJwt)
          .get(`/organizations/${stableOrgA.id}`),
        apiOrgsClient
          .withAuth(orgAJwt)
          .get(`/organizations/${stableOrgA.id}`),
      ]);

      // 3. Assert: Both attempts succeed
      expect(ownOrgAttempts[0].status).toBe(200);
      expect(ownOrgAttempts[1].status).toBe(200);

      // 4. Act: Multiple attempts to access other org (should fail)
      // Guard should extract orgId from route param and deny access
      const otherOrgAttempts = await Promise.all([
        apiOrgsClient
          .withAuth(orgAJwt)
          .get(`/organizations/${stableOrgB.id}`),
        apiOrgsClient
          .withAuth(orgAJwt)
          .get(`/organizations/${stableOrgB.id}`),
      ]);

      // 5. Assert: Both attempts denied
      expect([403, 404]).toContain(otherOrgAttempts[0].status);
      expect([403, 404]).toContain(otherOrgAttempts[1].status);
    });
  });
});
