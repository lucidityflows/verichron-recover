/**
 * @system-rule R-AUTH-DEBTOR-003
 * @description Debtor Token Structure Validation - JWTs Must Contain Required DEBTOR Fields
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
import { seedPlatformAdmin, seedDebtor } from '../fixtures/api-users/seed/seed';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import * as jwt from 'jsonwebtoken';
import { JWT_CLAIMS_NAMESPACE } from '@verichron/contracts';
import { UserType, OrganizationStatus } from '@verichron/enums';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-change-in-production';

describe('TC-USR-AUTH-013: Debtor Token Rejected If Missing Required Fields', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let apiUsersClient: ApiUsersClient;
  let apiOrganizationsClient: ApiOrganizationsClient;

  beforeAll(async () => {
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();

    apiUsersClient = createApiUsersClient();
    apiOrganizationsClient = createApiOrganizationsClient();

    console.log('✅ Test setup complete');
  });

  afterAll(async () => {
    await usersDb.disconnect();
    await orgsDb.disconnect();
    console.log('❌ Test teardown complete');
  });

  describe('Scenario 1: Fresh Data Journey - DEBTOR Token Field Validation', () => {
    let testOrgId: string;
    let testUserId: string;
    let validDebtorToken: string;

    beforeAll(async () => {
      // Clear databases
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      apiUsersClient.clearCookies();

      // Create test organization
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const org = await orgFactory.createCollectionAgency({
        name: 'Test Collection Agency',
        status: OrganizationStatus.ACTIVE,
      });
      testOrgId = org.id;

      // Create actual debtor user (for control test)
      const debtor = await seedDebtor(
        usersDb.getDataSource(),
        [testOrgId],
        [org.name],
        {
          email: 'debtor.control@test.com',
          password: 'DebtorControl123!',
          firstName: 'Control',
          lastName: 'Debtor',
        },
      );
      testUserId = debtor.user.id;

      // Get valid DEBTOR token via login flow (for control test)
      const loginResponse = await apiUsersClient.login(
        debtor.user.email,
        debtor.password,
      );
      expect(loginResponse.status).toBe(201);

      const tokenResponse = await apiUsersClient.getToken(testOrgId);
      expect(tokenResponse.status).toBe(201);
      validDebtorToken = tokenResponse.body.accessToken;

      console.log('✅ Test data created with real debtor user');
    });

    it('should reject DEBTOR token missing organizationIds field', async () => {
      const malformedPayload = {
        sub: testUserId,
        userType: UserType.DEBTOR_USER,
        [JWT_CLAIMS_NAMESPACE]: {
          debtorPermissions: ['debtor:self:read', 'debtor:self:pay'],
          isDebtor: true,
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const malformedToken = jwt.sign(malformedPayload, JWT_SECRET);

      // Use dummy orgId for route construction
      const response = await apiUsersClient.getRoles(malformedToken, '00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(401);
    });

    it('should reject DEBTOR token with empty organizationIds array', async () => {
      const malformedPayload = {
        sub: testUserId,
        userType: UserType.DEBTOR_USER,
        [JWT_CLAIMS_NAMESPACE]: {
          organizationIds: [], 
          debtorPermissions: ['debtor:self:read', 'debtor:self:pay'],
          isDebtor: true,
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const malformedToken = jwt.sign(malformedPayload, JWT_SECRET);

      const response = await apiUsersClient.getPermissions(malformedToken, '00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(401);
    });

    it('should reject DEBTOR token missing debtorPermissions field', async () => {
      const malformedPayload = {
        sub: testUserId,
        userType: UserType.DEBTOR_USER,
        [JWT_CLAIMS_NAMESPACE]: {
          organizationIds: [testOrgId],
          isDebtor: true,
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const malformedToken = jwt.sign(malformedPayload, JWT_SECRET);

      const response = await apiOrganizationsClient.getOrganizations(malformedToken);

      expect(response.status).toBe(401);
    });

    it('should reject DEBTOR token with isDebtor: false', async () => {
      const malformedPayload = {
        sub: testUserId,
        userType: UserType.DEBTOR_USER,
        [JWT_CLAIMS_NAMESPACE]: {
          organizationIds: [testOrgId],
          debtorPermissions: ['debtor:self:read', 'debtor:self:pay'],
          isDebtor: false, 
        },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const malformedToken = jwt.sign(malformedPayload, JWT_SECRET);

      const response = await apiUsersClient.getRoles(malformedToken, testOrgId);

      expect(response.status).toBe(401);
    });

    it('should accept valid DEBTOR token with all required fields (control test)', async () => {
      const response = await apiUsersClient.getRoles(validDebtorToken, testOrgId);

      // EXPECT 403 Forbidden (passed auth, failed rbac)
      expect(response.status).toBe(403);
    });
  });

  describe('Scenario 2: Stable Data Journey - Cross-Service Validation', () => {
    let stableOrgId: string;
    let stableUserId: string;

    beforeAll(async () => {
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const org = await orgFactory.createCollectionAgency({
        name: 'Stable Collection Agency',
        status: OrganizationStatus.ACTIVE,
      });
      stableOrgId = org.id;

      const platformAdmin = await seedPlatformAdmin(usersDb.getDataSource());
      stableUserId = platformAdmin.user.id;
    });

    it('should reject malformed DEBTOR tokens on api-users endpoints', async () => {
      const endpoints = [
        { method: 'getRoles', name: 'GET /rbac/roles' },
        { method: 'getPermissions', name: 'GET /rbac/permissions' },
      ];

      for (const endpoint of endpoints) {
        const malformedPayload = {
          sub: stableUserId,
          userType: UserType.DEBTOR_USER,
          [JWT_CLAIMS_NAMESPACE]: {
            debtorPermissions: ['debtor:self:read'],
            isDebtor: true,
          },
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const malformedToken = jwt.sign(malformedPayload, JWT_SECRET);

        const response = await (apiUsersClient as any)[endpoint.method](malformedToken, stableOrgId);

        expect(response.status).toBe(401);
      }
    });

    it('should consistently reject across multiple malformed field combinations', async () => {
      const invalidCombinations = [
        {
          name: 'missing organizationIds + debtorPermissions',
          payload: {
            sub: stableUserId,
            userType: UserType.DEBTOR_USER,
            [JWT_CLAIMS_NAMESPACE]: {
              isDebtor: true,
            },
          },
        },
        {
          name: 'empty organizationIds + missing isDebtor',
          payload: {
            sub: stableUserId,
            userType: UserType.DEBTOR_USER,
            [JWT_CLAIMS_NAMESPACE]: {
              organizationIds: [],
              debtorPermissions: ['debtor:self:read'],
            },
          },
        },
      ];

      for (const testCase of invalidCombinations) {
        const malformedPayload = {
          ...testCase.payload,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const malformedToken = jwt.sign(malformedPayload, JWT_SECRET);

        const usersResponse = await apiUsersClient.getRoles(malformedToken, stableOrgId);
        const orgsResponse = await apiOrganizationsClient.getOrganizations(malformedToken);

        expect(usersResponse.status).toBe(401);
        expect(orgsResponse.status).toBe(401);
      }
    });
  });
});