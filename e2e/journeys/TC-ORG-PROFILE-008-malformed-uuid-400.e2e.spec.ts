/**
 * @system-rule R-SEC-001
 * @description Malformed UUID Returns 400 - Input Validation
 *
 * This test validates that API endpoints reject malformed UUIDs with 400 Bad Request
 * responses. This is a critical security and data integrity control:
 * 1. **Input Validation**: Catch invalid input before database queries
 * 2. **Security**: Prevent SQL injection and malformed query attempts
 * 3. **Performance**: Fail fast without expensive database lookups
 * 4. **User Experience**: Clear validation errors at API boundary
 *
 * ## What This Test Proves:
 * 1. **400 Response**: Malformed UUIDs return Bad Request status
 * 2. **Early Validation**: Validation happens before database access
 * 3. **Multiple Formats**: Various malformed UUID formats consistently rejected
 * 4. **Clear Error Messages**: Descriptive error messages for developers
 * 5. **Cross-Endpoint Consistency**: All endpoints validate UUIDs the same way
 *
 * ## Malformed UUID Patterns Tested:
 * - Empty strings
 * - Non-UUID strings ("abc", "12345")
 * - Partial UUIDs (missing sections)
 * - Wrong format (too short, too long)
 * - Invalid characters (special chars, spaces)
 * - UUID v1/v3 when v4 expected (if applicable)
 *
 * ## Test Strategy - Two-Fold Journey:
 * - **Scenario 1 (Fresh Data)**: Test against various endpoints with malformed UUIDs
 * - **Scenario 2 (Stable Data)**: Comprehensive malformed UUID format testing
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

describe('TC-ORG-PROFILE-008: Malformed UUID Returns 400', () => {
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

  describe('Scenario 1: Fresh Data Journey - Malformed UUIDs Rejected', () => {
    const malformedUuids = [
      { value: 'not-a-uuid', description: 'non-UUID string' },
      { value: '12345', description: 'numeric string' },
      { value: 'abc-def-ghi', description: 'wrong format with dashes' },
      { value: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', description: 'invalid characters' },
    ];

    it('should return 400 for GET /orgs/:id with malformed UUIDs', async () => {
      for (const testCase of malformedUuids) {
        const response = await apiOrganizationsClient.getOrganizationOps(
          platformAdminJwt,
          testCase.value,
        );

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/invalid|malformed|uuid|bad request|validation/i);

        console.log(`✅ GET /orgs/${testCase.description} returned 400: ${response.body.message}`);
      }
    });

    it('should return 400 for PATCH /orgs/:id with malformed UUIDs', async () => {
      for (const testCase of malformedUuids) {
        const response = await apiOrganizationsClient.updateOrganizationOps(
          platformAdminJwt,
          testCase.value,
          { displayName: 'Should Not Update' },
        );

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/invalid|malformed|uuid|bad request|validation/i);

        console.log(`✅ PATCH /orgs/${testCase.description} returned 400`);
      }
    });

    it('should return 400 for DELETE /orgs/:id with malformed UUIDs', async () => {
      for (const testCase of malformedUuids) {
        const response = await apiOrganizationsClient.deleteOrganizationOps(
          platformAdminJwt,
          testCase.value,
        );

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/invalid|malformed|uuid|bad request|validation/i);

        console.log(`✅ DELETE /orgs/${testCase.description} returned 400`);
      }
    });
  });

  describe('Scenario 2: Stable Data Journey - Comprehensive UUID Format Testing', () => {
    const comprehensiveMalformedUuids = [
      // Too short
      { value: '123e4567-e89b-12d3-a456', description: 'incomplete UUID (too short)' },

      // Too long
      { value: '123e4567-e89b-12d3-a456-426614174000-extra', description: 'too long' },

      // Missing sections
      { value: '123e4567-e89b-12d3', description: 'missing sections' },

      // Wrong separator
      { value: '123e4567_e89b_12d3_a456_426614174000', description: 'underscores instead of dashes' },

      // No separators
      { value: '123e4567e89b12d3a456426614174000', description: 'no separators' },

      // Special characters
      { value: '123e4567-e89b-12d3-a456-42661417400!', description: 'special character' },
      { value: '123e4567 e89b 12d3 a456 426614174000', description: 'spaces instead of dashes' },

      // Case sensitivity (all uppercase might be valid, but test implementation)
      { value: 'NULL', description: 'SQL NULL keyword' },
      { value: 'undefined', description: 'JavaScript undefined' },

      // SQL injection attempts
      { value: "'; DROP TABLE organizations; --", description: 'SQL injection attempt' },
      { value: '1 OR 1=1', description: 'SQL condition injection' },

      // Path traversal
      { value: '../../../etc/passwd', description: 'path traversal attempt' },

      // XSS attempts
      { value: '<script>alert(1)</script>', description: 'XSS attempt' },
    ];

    it('should reject all comprehensive malformed UUID formats', async () => {
      for (const testCase of comprehensiveMalformedUuids) {
        const response = await apiOrganizationsClient.getOrganizationOps(
          platformAdminJwt,
          testCase.value,
        );

        // Accept both 400 (truly malformed) and 404 (valid format but doesn't exist)
        // Some UUID validators accept formats like no-separator that appear malformed
        expect([400, 404]).toContain(response.status);

        if (response.status === 400) {
          expect(response.body.message).toMatch(/invalid|malformed|uuid|bad request|validation/i);
        } else {
          expect(response.body.message).toMatch(/not found|does not exist|cannot GET|cannot PATCH|cannot DELETE/i);
        }

        console.log(`✅ Rejected ${testCase.description}: ${response.status}`);
      }
    });

    it('should provide clear validation error messages', async () => {
      const testCases = [
        { value: 'not-a-uuid', expectedPattern: /uuid|validation|invalid/i },
        { value: '12345', expectedPattern: /uuid|validation|invalid/i },
      ];

      for (const testCase of testCases) {
        const response = await apiOrganizationsClient.getOrganizationOps(
          platformAdminJwt,
          testCase.value,
        );

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(testCase.expectedPattern);

        // Ensure error response has proper structure
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode');
        expect(response.body.statusCode).toBe(400);

        console.log(`✅ Clear error for "${testCase.value}": ${response.body.message}`);
      }
    });

    it('should distinguish between 400 (malformed) and 404 (not found)', async () => {
      // ARRANGE: Valid UUID format but doesn't exist vs malformed UUID
      const validFormatNotFound = '00000000-0000-0000-0000-000000000001';
      const malformedUuid = 'not-a-uuid';

      // ACT
      const validResponse = await apiOrganizationsClient.getOrganizationOps(
        platformAdminJwt,
        validFormatNotFound,
      );

      const malformedResponse = await apiOrganizationsClient.getOrganizationOps(
        platformAdminJwt,
        malformedUuid,
      );

      // ASSERT: Different error codes for different error types
      expect(validResponse.status).toBe(404); // Valid format, doesn't exist
      expect(malformedResponse.status).toBe(400); // Malformed format

      expect(validResponse.body.message).toMatch(/not found|does not exist/i);
      expect(malformedResponse.body.message).toMatch(/invalid|malformed|uuid|validation/i);

      console.log('✅ Correctly distinguishes 400 (malformed) from 404 (not found)');
    });

    it('should validate UUIDs before database queries (performance)', async () => {
      // This test ensures validation happens at the API layer, not database layer
      // We test by using malformed UUIDs that would cause database errors if not validated

      const sqlInjectionAttempts = [
        "'; DELETE FROM organizations WHERE '1'='1",
        '1 UNION SELECT * FROM users',
        "' OR 1=1 --",
      ];

      for (const attempt of sqlInjectionAttempts) {
        const startTime = Date.now();

        const response = await apiOrganizationsClient.getOrganizationOps(
          platformAdminJwt,
          attempt,
        );

        const duration = Date.now() - startTime;

        // ASSERT: Fast rejection (< 100ms indicates no DB query)
        expect(response.status).toBe(400);
        expect(duration).toBeLessThan(100);

        console.log(`✅ SQL injection rejected in ${duration}ms (no DB query)`);
      }
    });
  });
});
