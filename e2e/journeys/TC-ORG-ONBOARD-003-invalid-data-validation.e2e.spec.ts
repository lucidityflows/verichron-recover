/**
 * @system-rule R-SEC-001
 * @description Onboarding with Invalid Data Fails Validation - Input Validation
 *
 * This test validates that the organization onboarding endpoint properly validates
 * all input data and rejects invalid/malformed requests with clear error messages.
 * This is critical for:
 * 1. **Data Integrity**: Ensure only valid data enters the system
 * 2. **Security**: Prevent injection attacks and malformed data
 * 3. **User Experience**: Provide clear validation feedback
 * 4. **System Stability**: Prevent invalid state from breaking business logic
 *
 * ## What This Test Proves:
 * 1. **Required Fields**: Missing required fields rejected with 400
 * 2. **Field Types**: Wrong types (string vs number) rejected
 * 3. **Field Constraints**: Length limits, format requirements enforced
 * 4. **Email Validation**: Invalid email formats rejected
 * 5. **Enum Validation**: Invalid enum values rejected
 * 6. **Clear Error Messages**: Validation errors include field names and requirements
 * 7. **Multiple Errors**: All validation errors returned (not just first)
 *
 * ## Test Strategy - Two-Fold Journey:
 * - **Scenario 1 (Fresh Data)**: Test all validation rules systematically
 * - **Scenario 2 (Stable Data)**: Test edge cases and boundary conditions
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

describe('TC-ORG-ONBOARD-003: Onboarding with Invalid Data Fails Validation', () => {
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
    const tokenResponse = await apiUsersClient.getToken(null);
    platformAdminJwt = tokenResponse.body.accessToken;

    console.log('✅ Test setup complete');
  });

  afterAll(async () => {
    await usersDb.disconnect();
    await orgsDb.disconnect();
    console.log('❌ Test teardown complete');
  });

  describe('Scenario 1: Fresh Data Journey - Required Field Validation', () => {
    it('should reject onboarding request with missing organization name', async () => {
      // ARRANGE: Missing organization.name
      const invalidData = {
        organization: {
          // name: 'Missing',  // ← MISSING
          displayName: 'Test Org',
          organizationType: 'COLLECTION_AGENCY',
        },
        initialAdmin: {
          email: 'admin@test.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT
      expect(response.status).toBe(400);
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/name|required|validation/i);

      console.log(`✅ Missing org name rejected: ${response.body.message}`);
    });

    it('should reject onboarding request with missing admin email', async () => {
      // ARRANGE: Missing initialAdmin.email
      const invalidData = {
        organization: {
          name: 'Test Organization',
          displayName: 'Test Org',
          organizationType: 'COLLECTION_AGENCY',
        },
        initialAdmin: {
          // email: 'missing@test.com',  // ← MISSING
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT
      expect(response.status).toBe(400);
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/email|required|validation/i);

      console.log(`✅ Missing admin email rejected: ${response.body.message}`);
    });

    it('should reject onboarding request with missing admin firstName', async () => {
      // ARRANGE
      const invalidData = {
        organization: {
          name: 'Test Organization',
          displayName: 'Test Org',
          organizationType: 'COLLECTION_AGENCY',
        },
        initialAdmin: {
          email: 'admin@test.com',
          // firstName: 'Missing',  // ← MISSING
          lastName: 'Doe',
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT
      expect(response.status).toBe(400);
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/firstName|required|validation/i);

      console.log(`✅ Missing firstName rejected: ${response.body.message}`);
    });

    it('should reject onboarding request with missing admin lastName', async () => {
      // ARRANGE
      const invalidData = {
        organization: {
          name: 'Test Organization',
          displayName: 'Test Org',
          organizationType: 'COLLECTION_AGENCY',
        },
        initialAdmin: {
          email: 'admin@test.com',
          firstName: 'John',
          // lastName: 'Missing',  // ← MISSING
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT
      expect(response.status).toBe(400);
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/lastName|required|validation/i);

      console.log(`✅ Missing lastName rejected: ${response.body.message}`);
    });

    it('should reject onboarding request with invalid email format', async () => {
      // ARRANGE: Invalid email formats
      const invalidEmails = [
        'not-an-email',
        'missing-at-sign.com',
        '@no-local-part.com',
        'no-domain@',
        'spaces in@email.com',
        'multiple@@at.com',
      ];

      for (const invalidEmail of invalidEmails) {
        const invalidData = {
          organization: {
            name: 'Test Organization',
            displayName: 'Test Org',
            organizationType: 'COLLECTION_AGENCY',
          },
          initialAdmin: {
            email: invalidEmail,
            firstName: 'John',
            lastName: 'Doe',
          },
        };

        // ACT
        const response = await apiOrganizationsClient
          .withAuth(platformAdminJwt)
          .post('/onboarding', invalidData);

        // ASSERT
        expect(response.status).toBe(400);
        const message = Array.isArray(response.body.message)
          ? response.body.message.join(' ')
          : response.body.message;
        expect(message).toMatch(/email|invalid|validation/i);

        console.log(`✅ Invalid email "${invalidEmail}" rejected`);
      }
    });

    it('should reject onboarding request with invalid organizationType', async () => {
      // ARRANGE: Invalid enum value
      const invalidData = {
        organization: {
          name: 'Test Organization',
          displayName: 'Test Org',
          organizationType: 'INVALID_TYPE', // ← Invalid enum
        },
        initialAdmin: {
          email: 'admin@test.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT
      expect(response.status).toBe(400);
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/organizationType|invalid|enum|validation/i);

      console.log(`✅ Invalid organizationType rejected: ${response.body.message}`);
    });

    it('should reject onboarding request with empty strings for required fields', async () => {
      // ARRANGE: Empty strings (should be treated as missing)
      const invalidData = {
        organization: {
          name: '',  // ← Empty string
          displayName: 'Test Org',
          organizationType: 'COLLECTION_AGENCY',
        },
        initialAdmin: {
          email: 'admin@test.com',
          firstName: '',  // ← Empty string
          lastName: 'Doe',
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT
      expect(response.status).toBe(400);
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/name|firstName|required|empty|validation/i);

      console.log(`✅ Empty strings rejected: ${response.body.message}`);
    });
  });

  describe('Scenario 2: Stable Data Journey - Field Constraints and Edge Cases', () => {
    it('should reject organization name exceeding max length', async () => {
      // ARRANGE: Name longer than max (assume 255 chars)
      const longName = 'A'.repeat(256);

      const invalidData = {
        organization: {
          name: longName,
          displayName: 'Test Org',
          organizationType: 'COLLECTION_AGENCY',
        },
        initialAdmin: {
          email: 'admin@test.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT
      expect(response.status).toBe(400);
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/name|length|max|validation/i);

      console.log(`✅ Org name too long rejected: ${response.body.message}`);
    });

    it('should reject names that are too short', async () => {
      // ARRANGE: Name with single character (assume min 2 chars)
      const invalidData = {
        organization: {
          name: 'A',  // ← Too short
          displayName: 'Test Org',
          organizationType: 'COLLECTION_AGENCY',
        },
        initialAdmin: {
          email: 'admin@test.com',
          firstName: 'J',  // ← Too short
          lastName: 'D',  // ← Too short
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT
      expect(response.status).toBe(400);
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/name|firstName|lastName|length|min|validation/i);

      console.log(`✅ Names too short rejected: ${response.body.message}`);
    });

    it('should reject special characters in names (if applicable)', async () => {
      // ARRANGE: Special characters that might not be allowed
      const invalidData = {
        organization: {
          name: 'Test<script>alert(1)</script>Org',  // ← XSS attempt
          displayName: 'Test Org',
          organizationType: 'COLLECTION_AGENCY',
        },
        initialAdmin: {
          email: 'admin@test.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT: Should be rejected with 400 Bad Request
      expect(response.status).toBe(400);
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/name|invalid|character|validation/i); // Expect validation error

      console.log(`✅ Special characters rejected: ${response.body.message}`);
    });

    it('should return multiple validation errors in single response', async () => {
      // ARRANGE: Multiple validation errors
      const invalidData = {
        organization: {
          name: '',  // ← Empty
          // displayName missing
          organizationType: 'INVALID',  // ← Invalid enum
        },
        initialAdmin: {
          email: 'not-an-email',  // ← Invalid format
          firstName: '',  // ← Empty
          // lastName missing
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT
      expect(response.status).toBe(400);

      // Should mention multiple issues (or have multiple error objects)
      const errorMessage = JSON.stringify(response.body).toLowerCase();

      // Look for evidence of multiple errors being reported
      const errorIndicators = [
        errorMessage.includes('name'),
        errorMessage.includes('email'),
        errorMessage.includes('firstname') || errorMessage.includes('first'),
        errorMessage.includes('lastname') || errorMessage.includes('last'),
      ];

      const errorsReported = errorIndicators.filter(Boolean).length;
      expect(errorsReported).toBeGreaterThan(1);

      console.log(`✅ Multiple validation errors reported: ${errorsReported} fields`);
    });

    it('should reject wrong field types', async () => {
      // ARRANGE: Wrong types (e.g., number instead of string)
      const invalidData = {
        organization: {
          name: 12345,  // ← Number instead of string
          displayName: 'Test Org',
          organizationType: 'COLLECTION_AGENCY',
        },
        initialAdmin: {
          email: true,  // ← Boolean instead of string
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT
      expect(response.status).toBe(400);
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/type|string|validation|email|boolean/i);

      console.log(`✅ Wrong field types rejected: ${response.body.message}`);
    });

    it('should reject null values for required fields', async () => {
      // ARRANGE: Null values
      const invalidData = {
        organization: {
          name: null,  // ← Null
          displayName: 'Test Org',
          organizationType: 'COLLECTION_AGENCY',
        },
        initialAdmin: {
          email: null,  // ← Null
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      // ACT
      const response = await apiOrganizationsClient
        .withAuth(platformAdminJwt)
        .post('/onboarding', invalidData);

      // ASSERT
      expect(response.status).toBe(400);
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/name|email|required|validation/i);

      console.log(`✅ Null values rejected: ${response.body.message}`);
    });
  });
});
