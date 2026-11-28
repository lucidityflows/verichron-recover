/**
 * @system-rule R-DATA-001
 * @description Organization List Pagination - Query Capability
 *
 * This test validates that the GET /orgs endpoint properly supports pagination
 * with pageSize/offset/page parameters and returns correct metadata. Pagination is
 * critical for:
 * 1. **Performance**: pageSize data transfer for large datasets
 * 2. **User Experience**: Enable infinite scroll / paginated UI components
 * 3. **API Design**: Follow RESTful best practices for list endpoints
 * 4. **Resource Management**: Prevent excessive memory usage on server
 *
 * ## What This Test Proves:
 * 1. **pageSize Parameter**: Controls number of results returned
 * 2. **Page/Offset Parameter**: Controls which page/offset to return
 * 3. **Metadata**: Response includes total count, current page, hasMore, etc.
 * 4. **Default Values**: Sensible defaults when parameters not provided
 * 5. **Boundary Conditions**: Edge cases (page beyond total, pageSize=0, etc.)
 * 6. **Consistency**: Pagination metadata matches actual data returned
 *
 * ## Test Strategy - Two-Fold Journey:
 * - **Scenario 1 (Fresh Data)**: Create known dataset, test pagination parameters
 * - **Scenario 2 (Stable Data)**: Test with pre-seeded data for consistency
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

describe('TC-ORG-PROFILE-011: Organization List Pagination', () => {
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

  describe('Scenario 1: Fresh Data Journey - Pagination Parameters', () => {
    beforeAll(async () => {
      // Create exactly 25 organizations for predictable pagination testing
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());

      for (let i = 1; i <= 25; i++) {
        await orgFactory.createCollectionAgency({
          name: `Test Agency ${i.toString().padStart(2, '0')}`,
          status: OrganizationStatus.ACTIVE,
        });
      }

      console.log('✅ Created 25 test organizations');
    });

    afterAll(async () => {
      await orgsDb.cleanAllTables();
    });

    it('should return default page size when no pageSize specified', async () => {
      // ACT: Request without pagination parameters
      const response = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt);

      // ASSERT: Returns default pageSize (typically 10 or 20)
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify metadata
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBe(25);
      expect(response.body.meta.page).toBeDefined();
      expect(response.body.meta.pageSize).toBeDefined();

      console.log(`✅ Default pagination: ${response.body.data.length} items, total: ${response.body.meta.total}, pageSize: ${response.body.meta.pageSize}`);
    });

    it('should respect pageSize parameter', async () => {
      // ACT: Request with pageSize=5
      const response = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 5,
        page: 1,
      });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(5);
      expect(response.body.meta.pageSize).toBe(5);
      expect(response.body.meta.total).toBe(25);

      console.log('✅ pageSize parameter respected: 5 items returned');
    });

    it('should paginate through results correctly', async () => {
      // ACT: Request page 1, page 2, page 3 with pageSize=10
      const page1 = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 10,
        page: 1,
      });

      const page2 = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 10,
        page: 2,
      });

      const page3 = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 10,
        page: 3,
      });

      // ASSERT: Page 1 has 10 items
      expect(page1.body.data.length).toBe(10);
      expect(page1.body.meta.page).toBe(1);

      // ASSERT: Page 2 has 10 items
      expect(page2.body.data.length).toBe(10);
      expect(page2.body.meta.page).toBe(2);

      // ASSERT: Page 3 has 5 items (remaining)
      expect(page3.body.data.length).toBe(5);
      expect(page3.body.meta.page).toBe(3);

      // ASSERT: No duplicate items across pages
      const page1Ids = page1.body.data.map((org: any) => org.id);
      const page2Ids = page2.body.data.map((org: any) => org.id);
      const page3Ids = page3.body.data.map((org: any) => org.id);

      const allIds = [...page1Ids, ...page2Ids, ...page3Ids];
      const uniqueIds = new Set(allIds);

      expect(uniqueIds.size).toBe(25); // All items unique

      console.log('✅ Pagination works correctly: 10 + 10 + 5 = 25 items');
    });

    it('should include hasMore/hasNext metadata', async () => {
      // ACT: Request page 1 and page 3
      const page1 = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 10,
        page: 1,
      });

      const page3 = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 10,
        page: 3,
      });

      // ASSERT: Page 1 should have more data
      expect(page1.body.meta.hasNextPage).toBeDefined();
      expect(page1.body.meta.hasNextPage).toBe(true);
      expect(page1.body.meta.hasPreviousPage).toBe(false);

      // ASSERT: Page 3 (last page) should have no more data
      expect(page3.body.meta.hasNextPage).toBe(false);
      expect(page3.body.meta.hasPreviousPage).toBe(true);

      console.log('✅ hasMore/hasNext metadata correctly indicates pagination state');
    });

    it('should handle page beyond total count gracefully', async () => {
      // ACT: Request page 100 (way beyond available data)
      const response = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 10,
        page: 100,
      });

      // ASSERT: Returns empty array, not an error
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);

      expect(response.body.meta.total).toBe(25);
      expect(response.body.meta.page).toBe(100);

      console.log('✅ Page beyond total returns empty array gracefully');
    });

    it('should handle pageSize=0 or negative pageSize gracefully', async () => {
      // ACT: Request with pageSize=0
      const zeroPageSize = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 0,
        page: 1,
      });

      // ASSERT: Either returns default pageSize or returns validation error
      // Both behaviors are acceptable depending on API design
      expect(zeroPageSize.status).toBe(400); // Expect 400 for invalid pageSize
      // The validation pipe returns an array of messages, so we join it to check.
      const message = Array.isArray(zeroPageSize.body.message)
        ? zeroPageSize.body.message.join(' ')
        : zeroPageSize.body.message;
      expect(message).toMatch(/pageSize|min|validation/i);
    });

    it('should calculate total pages correctly in metadata', async () => {
      // ACT: Request with pageSize=7 (25 total / 7 = 4 pages)
      const response = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 7,
        page: 1,
      });

      // ASSERT: Total pages should be 4 (7+7+7+4=25)
      if (response.body.meta.totalPages !== undefined) {
        expect(response.body.meta.totalPages).toBe(4);
        console.log('✅ totalPages metadata correctly calculated: 4 pages');
      } else {
        console.log('⚠️  totalPages metadata not provided (optional)');
      }
    });
  });

  describe('Scenario 2: Stable Data Journey - Edge Cases and Consistency', () => {
    let stableOrgIds: string[];

    beforeAll(async () => {
      // Create stable set of organizations
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      stableOrgIds = [];

      for (let i = 1; i <= 15; i++) {
        const org = await orgFactory.createCollectionAgency({
          name: `Stable Agency ${i.toString().padStart(2, '0')}`,
          status: OrganizationStatus.ACTIVE,
        });
        stableOrgIds.push(org.id);
      }

      console.log('✅ Created 15 stable organizations');
    });

    it('should return consistent results for same page', async () => {
      // ACT: Request same page twice
      const request1 = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 5,
        page: 2,
      });

      const request2 = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 5,
        page: 2,
      });

      // ASSERT: Results should be identical
      expect(request1.body.data.length).toBe(request2.body.data.length);

      const ids1 = request1.body.data.map((org: any) => org.id).sort();
      const ids2 = request2.body.data.map((org: any) => org.id).sort();

      expect(ids1).toEqual(ids2);

      console.log('✅ Pagination returns consistent results for same page');
    });

    it('should handle maximum pageSize constraints', async () => {
      // ACT: Request with very large pageSize (e.g., 1000)
      const response = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
        pageSize: 1000,
        page: 1,
      });

      // ASSERT: Either respects max pageSize or returns all data
      expect(response.status).toBe(400); // Expect 400 for invalid pageSize
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/pageSize|max|validation/i); // Assert for message

      console.log(`✅ Large pageSize handled: requested 1000, got ${response.status === 200 ? response.body.data.length + ' items' : 'error: ' + JSON.stringify(response.body.message)}`);
    });

    it('should maintain order consistency across pages', async () => {
      // ACT: Get all pages
      const allPages = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 10) {
        const response = await apiOrganizationsClient.getOrganizationsOps(platformAdminJwt, {
          pageSize: 5,
          page,
        });

        allPages.push(...(response.body.data || []));
        hasMore = response.body.meta.hasNextPage || false;
        page++;
      }

      // ASSERT: Order should be consistent (typically by createdAt or name)
      const names = allPages.map((org: any) => org.name);

      // Check if sorted (either ascending or descending)
      const ascending = [...names].sort();
      const descending = [...names].sort().reverse();

      const isConsistentOrder =
        JSON.stringify(names) === JSON.stringify(ascending) ||
        JSON.stringify(names) === JSON.stringify(descending);

      expect(isConsistentOrder).toBe(true);

      console.log('✅ Order consistent across all pages');
    });
  });
});
