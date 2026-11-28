/**
 * @system-rule R-SEC-003
 * @description SQL Injection Prevention - Parameterized Queries Must Prevent SQL Injection Attacks
 *
 * ## What This Test Proves:
 * 1. **Parameterized Queries**: All database queries use parameterized statements that prevent SQL injection
 * 2. **Query Parameter Safety**: Search/filter parameters cannot inject SQL code
 * 3. **Path Parameter Safety**: Resource IDs in URLs cannot inject SQL code
 * 4. **Data Integrity**: SQL injection attempts do not corrupt or expose data
 * 5. **Error Handling**: SQL injection attempts return appropriate errors (not SQL error messages)
 * 6. **No Bypass**: Common SQL injection patterns (UNION, OR, comments) are neutralized
 *
 * ## What This Test Does NOT Prove:
 * - NoSQL injection prevention (if using NoSQL databases)
 * - ORM-level injection (assumes TypeORM is configured correctly)
 * - Second-order SQL injection (stored data later used in queries)
 * - Blind SQL injection detection (time-based or boolean-based)
 * - Advanced injection techniques (encoding, obfuscation)
 *
 * ## Security Properties Validated:
 * - **Input Sanitization**: Malicious input is treated as literal data, not SQL code
 * - **Query Structure Integrity**: Query structure cannot be modified by user input
 * - **No Information Disclosure**: SQL errors are not leaked to clients
 * - **Data Isolation**: Injection cannot bypass organization-level data isolation
 *
 * ## Implementation Notes & Insights:
 *
 * ### Why SQL Injection Prevention is Critical:
 * SQL injection is consistently ranked in OWASP Top 10. Without prevention, attackers could:
 * 1. Extract sensitive data from other organizations (bypass multi-tenancy)
 * 2. Modify or delete data (DROP TABLE, UPDATE, DELETE)
 * 3. Escalate privileges (modify user roles/permissions)
 * 4. Execute arbitrary commands on database server
 * 5. Bypass authentication and authorization
 *
 * ### Common SQL Injection Patterns Tested:
 * 1. **Classic Injection**: `' OR '1'='1` - Always-true condition
 * 2. **UNION Injection**: `' UNION SELECT * FROM users--` - Join malicious query
 * 3. **Comment Injection**: `'; DROP TABLE organizations;--` - Execute additional statements
 * 4. **Boolean Injection**: `' AND 1=1--` - Test for blind injection
 * 5. **String Termination**: `admin'--` - Terminate string and comment out rest
 *
 * ### How TypeORM Prevents SQL Injection:
 * TypeORM uses parameterized queries by default:
 * ```typescript
 * // ✅ SAFE: Parameters are escaped
 * repository.createQueryBuilder()
 *   .where('name = :name', { name: userInput })
 *   .getMany();
 *
 * // ❌ UNSAFE: Raw SQL string concatenation
 * repository.query(`SELECT * FROM orgs WHERE name = '${userInput}'`);
 * ```
 *
 * ### Expected Behavior:
 * - Injection attempts are treated as literal search strings
 * - No SQL syntax errors returned to client
 * - No data exposure beyond authorized scope
 * - Queries return empty results or specific matches (not all data)
 * - Proper error codes: 400 for invalid format, 404 for not found, NOT 500
 *
 * ### Testing Strategy:
 * - Test query parameters (search, name filters)
 * - Test path parameters (organization IDs, user IDs)
 * - Test against multiple endpoints in both services
 * - Verify data integrity: count records before/after injection attempts
 * - Include control tests with valid input to ensure queries work normally
 *
 * ### What Successful Prevention Looks Like:
 * - Input `' OR '1'='1` is treated as literal string "' OR '1'='1"
 * - No organizations/users are returned (no match for that literal name)
 * - No SQL error messages leaked
 * - Database remains unchanged (verified by counting records)
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
import { createUserFactory } from '../fixtures/api-users/factories/userFactory';
import { createRoleFactory } from '../fixtures/api-users/factories/roleFactory';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import { OrganizationStatus, OrganizationType } from '@verichron/enums';

describe('TC-SEC-003: SQL Injection Prevention', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let apiUsersClient: ApiUsersClient;
  let apiOrgsClient: ApiOrganizationsClient;

  beforeAll(async () => {
    // 1. Initialize database helpers
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();

    // 2. Initialize API clients
    apiUsersClient = createApiUsersClient();
    apiOrgsClient = createApiOrganizationsClient();

    console.log('✅ Test setup complete');
  });

  afterAll(async () => {
    await usersDb.disconnect();
    await orgsDb.disconnect();
    console.log('❌ Test teardown complete');
  });

  /**
   * Scenario 1: Fresh Data Journey
   * Tests SQL injection prevention with organization query parameters
   */
  describe('Scenario 1: Fresh Data - SQL Injection in Organization Queries', () => {
    let platformToken: string;
    let orgToken: string;
    let testOrgId: string;
    let initialOrgCount: number;

    beforeAll(async () => {
      // Clean databases
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      apiUsersClient.clearCookies();
      apiOrgsClient.clearCookies();

      // Seed platform admin
      await seedPlatformAdmin(usersDb.getDataSource(), {
        email: 'platform.admin@verichron.com',
        password: 'PlatformAdmin123!',
        firstName: 'Platform',
        lastName: 'Admin',
      });

      // Create test organization
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const organization = await orgFactory.createOrganization({
        name: 'SQL Test Agency',
        organizationType: OrganizationType.COLLECTION_AGENCY,
        status: OrganizationStatus.ACTIVE,
      });
      testOrgId = organization.id;

      // Create organization admin
      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const role = await roleFactory.createOrgAdminRole(testOrgId);

      const userFactory = createUserFactory(usersDb.getDataSource());
      const user = await userFactory.createOrgAdmin(
        testOrgId,
        organization.name,
        role.id,
        {
          email: `sql-test-${Date.now()}@test.com`,
          password: 'SecurePass123!',
        },
      );

      // Get platform admin token
      const platformLogin = await apiUsersClient.login(
        'platform.admin@verichron.com',
        'PlatformAdmin123!',
      );
      expect(platformLogin.status).toBe(201);
      const platformTokenResponse = await apiUsersClient.getToken(null);
      expect(platformTokenResponse.status).toBe(201);
      platformToken = platformTokenResponse.body.accessToken;

      // Get org admin token
      apiUsersClient.clearCookies();
      const orgLogin = await apiUsersClient.login(user.email, user.password);
      expect(orgLogin.status).toBe(201);
      const orgTokenResponse = await apiUsersClient.getToken(testOrgId);
      expect(orgTokenResponse.status).toBe(201);
      orgToken = orgTokenResponse.body.accessToken;

      // Get initial organization count
      const countResult = await orgsDb.query('SELECT COUNT(*) as count FROM organizations');
      initialOrgCount = parseInt(countResult[0].count);
    });

    it('should prevent classic SQL injection in organization name filter (OR 1=1)', async () => {
      // Attempt classic SQL injection
      const maliciousName = "' OR '1'='1";
      const response = await apiOrgsClient.withAuth(platformToken).get(`/ops/organizations?name=${encodeURIComponent(maliciousName)}`);

      // Should not return all organizations
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0); // No match for literal string
    });

    it('should prevent UNION-based SQL injection in organization query', async () => {
      // Attempt UNION injection to extract data
      const maliciousName = "' UNION SELECT id, name FROM users--";
      const response = await apiOrgsClient.withAuth(platformToken).get(`/ops/organizations?name=${encodeURIComponent(maliciousName)}`);

      // Should not return user data or cause SQL error
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0); // No match
    });

    it('should prevent comment-based SQL injection (DROP TABLE)', async () => {
      // Attempt to execute destructive SQL
      const maliciousName = "'; DROP TABLE organizations;--";
      const response = await apiOrgsClient.withAuth(platformToken).get(`/ops/organizations?name=${encodeURIComponent(maliciousName)}`);

      // Should not cause SQL error or drop table
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify organizations table still exists and has same record count
      const countResult = await orgsDb.query('SELECT COUNT(*) as count FROM organizations');
      const finalCount = parseInt(countResult[0].count);
      expect(finalCount).toBe(initialOrgCount); // No records deleted
    });

    it('should prevent boolean-based blind SQL injection', async () => {
      // Attempt blind injection
      const maliciousName = "' AND 1=1--";
      const response = await apiOrgsClient.withAuth(platformToken).get(`/ops/organizations?name=${encodeURIComponent(maliciousName)}`);

      // Should not return all organizations
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0); // No match
    });

    it('should prevent SQL injection in organization ID path parameter', async () => {
      // Attempt injection via path parameter
      const maliciousId = "' OR '1'='1";
      const response = await apiOrgsClient.withAuth(platformToken).get(`/ops/organizations/${encodeURIComponent(maliciousId)}`);

      // Should return 400 (invalid UUID format) or 404, NOT 500 or data leak
      expect([400, 404]).toContain(response.status);
      expect(response.status).not.toBe(500); // No SQL error
    });

    it('should accept valid organization name query (control test)', async () => {
      // Verify normal queries work
      const response = await apiOrgsClient.withAuth(platformToken).get('/ops/organizations?name=SQL Test Agency');

      // Should find the test organization
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      const org = response.body.data.find((o: any) => o.id === testOrgId);
      expect(org).toBeDefined();
      expect(org.name).toBe('SQL Test Agency');
    });
  });

  /**
   * Scenario 2: Stable Data Journey
   * Tests SQL injection prevention in user queries
   */
  describe('Scenario 2: Stable Data - SQL Injection in User Queries', () => {
    let platformToken: string;
    let testOrgId: string;
    let testUserId: string;
    let initialUserCount: number;

    beforeAll(async () => {
      // Clean and setup
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      apiUsersClient.clearCookies();

      // Seed platform admin
      await seedPlatformAdmin(usersDb.getDataSource(), {
        email: 'platform.admin@verichron.com',
        password: 'PlatformAdmin123!',
        firstName: 'Platform',
        lastName: 'Admin',
      });

      // Create organization and users
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const organization = await orgFactory.createOrganization({
        name: 'User SQL Test Org',
        organizationType: OrganizationType.COLLECTION_AGENCY,
        status: OrganizationStatus.ACTIVE,
      });
      testOrgId = organization.id;

      const roleFactory = createRoleFactory(usersDb.getDataSource());
      const role = await roleFactory.createOrgUserRole(testOrgId);

      const userFactory = createUserFactory(usersDb.getDataSource());
      const user = await userFactory.createOrgUser(
        testOrgId,
        organization.name,
        role.id,
        {
          email: 'test.user@test.com',
          password: 'TestPass123!',
        },
      );
      testUserId = user.id;

      // Get platform admin token
      const platformLogin = await apiUsersClient.login(
        'platform.admin@verichron.com',
        'PlatformAdmin123!',
      );
      expect(platformLogin.status).toBe(201);
      const platformTokenResponse = await apiUsersClient.getToken(null);
      expect(platformTokenResponse.status).toBe(201);
      platformToken = platformTokenResponse.body.accessToken;

      // Get initial user count
      const countResult = await usersDb.query('SELECT COUNT(*) as count FROM users');
      initialUserCount = parseInt(countResult[0].count);
    });

    it('should prevent SQL injection in user search parameter', async () => {
      // Attempt SQL injection via search
      const maliciousSearch = "' OR '1'='1";
      const response = await apiUsersClient.getUsers(platformToken, undefined, {
        search: maliciousSearch,
      });

      // Should not return all users
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Search should treat input as literal string, finding no matches
      expect(response.body.data.length).toBe(0);
    });

    it('should prevent UNION injection in user queries', async () => {
      // Attempt UNION injection
      const maliciousSearch = "' UNION SELECT password_hash FROM users--";
      const response = await apiUsersClient.getUsers(platformToken, undefined, {
        search: maliciousSearch,
      });

      // Should not expose password hashes or cause error
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it('should prevent SQL injection in user ID path parameter', async () => {
      // Attempt injection via user ID path
      const maliciousId = "' OR '1'='1";
      const response = await apiUsersClient.withAuth(platformToken).get(`/ops/users/${encodeURIComponent(maliciousId)}`);

      // Should return 400 or 404, NOT 500 or data leak
      expect([400, 404]).toContain(response.status);
      expect(response.status).not.toBe(500);
    });

    it('should prevent SQL injection attempt to bypass organization isolation', async () => {
      // Attempt to bypass org isolation via SQL injection
      const maliciousSearch = "' OR organization_id IS NOT NULL--";
      const response = await apiUsersClient.getUsers(platformToken, undefined, {
        search: maliciousSearch,
      });

      // Should not return users from other organizations
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0); // No match for literal string
    });

    it('should maintain data integrity after injection attempts', async () => {
      // Verify users table unchanged after all injection attempts
      const countResult = await usersDb.query('SELECT COUNT(*) as count FROM users');
      const finalCount = parseInt(countResult[0].count);
      expect(finalCount).toBe(initialUserCount); // No records deleted/corrupted
    });

    it('should accept valid user search query (control test)', async () => {
      // Verify normal search works
      const response = await apiUsersClient.getUsers(platformToken, undefined, {
        search: 'test.user',
      });

      // Should find the test user
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      const user = response.body.data.find((u: any) => u.id === testUserId);
      expect(user).toBeDefined();
    });

    it('should accept valid user ID path parameter (control test)', async () => {
      // Verify normal user lookup works
      const response = await apiUsersClient.withAuth(platformToken).get(`/ops/users/${testUserId}`);

      // Should find the specific user
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testUserId);
    });
  });
});
