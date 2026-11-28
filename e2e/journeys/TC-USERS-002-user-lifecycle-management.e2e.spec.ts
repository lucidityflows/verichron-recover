/**
 * TC-USERS-002: User Lifecycle Management
 *
 * @system-rule R-USERS-002
 *
 * ## SYSTEM RULE: User Lifecycle Management
 *
 * Organization admins must be able to manage the complete lifecycle of users within their organization:
 * - **List users** with pagination, filtering, and search capabilities
 * - **View user details** including profile, memberships, and contact information
 * - **Update user profiles** (names, status changes)
 * - **Deactivate/Delete users** (soft delete by setting status to INACTIVE)
 * - **Data isolation** must be enforced - admins can only manage users in their organization
 * - **Events** must be published for profile updates and status changes for audit tracking
 */

import {
  createApiUsersClient,
  createApiOrganizationsClient,
  ApiUsersClient,
  ApiOrganizationsClient,
} from '../helpers/api-client.helper';
import {
  createUsersDbHelper,
  createOrganizationsDbHelper,
  DatabaseHelper,
} from '../helpers/database.helper';
import { createEventListenerHelper, EventListenerHelper } from '../helpers/event-listener.helper';
import { onboardAdmin } from '../fixtures/composed/onboard-admin';
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
} from '@verichron/events';
import {
  UserStatus,
  OrganizationType,
} from '@verichron/enums';
import {
  UserCreatedDto,
  UserActivatedDto,
  UserProfileUpdatedDto,
  UserStatusChangedDto,
} from '../../apps/api-users/src/events/event-dto';

describe('TC-USERS-002: User Lifecycle Management', () => {
  let apiUsersClient: ApiUsersClient;
  let apiOrgsClient: ApiOrganizationsClient;
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let eventListener: EventListenerHelper;

  beforeAll(async () => {
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();
    apiUsersClient = createApiUsersClient();
    apiOrgsClient = createApiOrganizationsClient();

    // Setup event listener
    eventListener = await createEventListenerHelper();
    await eventListener.startListening(EVENT_TOPICS.USERS);

    // Register DTO mappings for event validation
    eventListener.registerDtoMapping(EVENT_TYPES.USERS_USER_CREATED, UserCreatedDto);
    eventListener.registerDtoMapping(EVENT_TYPES.USERS_USER_ACTIVATED, UserActivatedDto);
    eventListener.registerDtoMapping(EVENT_TYPES.USERS_USER_PROFILE_UPDATED, UserProfileUpdatedDto);
    eventListener.registerDtoMapping(EVENT_TYPES.USERS_USER_STATUS_CHANGED, UserStatusChangedDto);

    // Wait for subscriptions to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    await eventListener?.stopAll();
    await usersDb?.disconnect();
    await orgsDb?.disconnect();
  });

  describe('Scenario 1: Fresh Data Journey', () => {
    let orgAdminToken: string;
    let testOrgId: string;
    let createdUserId: string;
    let otherOrgAdminToken: string;
    let otherOrgId: string;
    let otherOrgUserId: string;
    let orgAdminRoleId: string;

    beforeAll(async () => {
      // Clean databases for fresh data journey
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();

      // Wait a moment for cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // ARRANGE: Create test organization with admin
      const testOrgResult = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'User Lifecycle Test Org',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          adminEmail: 'lifecycle-admin@test.com',
          adminFirstName: 'Lifecycle',
          adminLastName: 'Admin',
        },
      );

      const testOrg = testOrgResult.organization;
      const orgAdmin = testOrgResult.admin;
      testOrgId = testOrg.id;
      orgAdminRoleId = testOrgResult.role.id;

      // Get token for org admin
      await apiUsersClient.login(orgAdmin.email, orgAdmin.password);
      const actTokenResponse = await apiUsersClient.getToken(testOrg.id);
      orgAdminToken = actTokenResponse.body.accessToken;

      // Create another org for isolation testing
      const otherOrgResult = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Other Org for Isolation Test',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          adminEmail: 'other-org-admin@test.com',
          adminFirstName: 'Other',
          adminLastName: 'Admin',
        },
      );

      const otherOrg = otherOrgResult.organization;
      const otherOrgAdmin = otherOrgResult.admin;
      otherOrgId = otherOrg.id;

      await apiUsersClient.login(otherOrgAdmin.email, otherOrgAdmin.password);
      const otherActTokenResponse = await apiUsersClient.getToken(otherOrg.id);
      otherOrgAdminToken = otherActTokenResponse.body.accessToken;

      // Create a user in the other org for isolation testing
      const otherOrgUserResponse = await apiUsersClient.post(
        `/organizations/${otherOrgId}/users`,
        {
          email: 'isolation-test-user@test.com',
          firstName: 'Isolation',
          lastName: 'User',
          roleId: otherOrgResult.role.id,
        },
        { headers: { 'Authorization': `Bearer ${otherOrgAdminToken}` } }
      );
      otherOrgUserId = otherOrgUserResponse.body.id;
    });

    beforeEach(() => {
      // Clear captured events before each test
      eventListener.clearEvents();
    });

    it('should allow admin to invite a new user to the organization', async () => {
      // ARRANGE: Prepare user data
      const newUserEmail = 'new-user@lifecycle-test.com';

      // ACT: Invite user
      const inviteResponse = await apiUsersClient.withAuth(orgAdminToken).post(
        `/organizations/${testOrgId}/users`,
        {
          email: newUserEmail,
          firstName: 'New',
          lastName: 'User',
          roleId: orgAdminRoleId,
        }
      );

      // ASSERT: User created successfully
      expect(inviteResponse.status).toBe(201);
      expect(inviteResponse.body.email).toBe(newUserEmail);
      expect(inviteResponse.body.status).toBe(UserStatus.PENDING);
      createdUserId = inviteResponse.body.id;

      // Verify UserCreated event was published
      const userCreatedEvent = await eventListener.waitForEvent(EVENT_TYPES.USERS_USER_CREATED, {
        predicate: (event: any) => event.payload.userId === createdUserId,
        timeout: 5000,
      });
      expect(userCreatedEvent).toBeDefined();
      expect(userCreatedEvent.payload.organizationId).toBe(testOrgId);
    });

    it('should allow admin to list users in their organization with pagination', async () => {
      // ACT: List users
      const listResponse = await apiUsersClient.getUsers(orgAdminToken, testOrgId, {
        page: 1,
        pageSize: 10,
      });

      // ASSERT: Pagination structure is correct
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toBeInstanceOf(Array);
      expect(listResponse.body.total).toBeGreaterThanOrEqual(2); // Admin + created user
      expect(listResponse.body.page).toBe(1);
      expect(listResponse.body.pageSize).toBe(10);

      // Verify our created user is in the list
      const users = listResponse.body.data;
      const foundUser = users.find((u: any) => u.id === createdUserId);
      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe('new-user@lifecycle-test.com');
    });

    it('should allow admin to filter users by status', async () => {
      // ACT: Filter by PENDING status
      const pendingResponse = await apiUsersClient.getUsers(orgAdminToken, testOrgId, {
        status: UserStatus.PENDING,
      });

      // ASSERT: Only PENDING users returned
      expect(pendingResponse.status).toBe(200);
      const pendingUsers = pendingResponse.body.data;
      expect(pendingUsers.length).toBeGreaterThanOrEqual(1);
      pendingUsers.forEach((user: any) => {
        expect(user.status).toBe(UserStatus.PENDING);
      });

      // ACT: Filter by ACTIVE status
      const activeResponse = await apiUsersClient.getUsers(orgAdminToken, testOrgId, {
        status: UserStatus.ACTIVE,
      });

      // ASSERT: Only ACTIVE users returned
      expect(activeResponse.status).toBe(200);
      const activeUsers = activeResponse.body.data;
      activeUsers.forEach((user: any) => {
        expect(user.status).toBe(UserStatus.ACTIVE);
      });
    });

    it('should allow admin to search users by name or email', async () => {
      // ACT: Search by email substring
      const searchResponse = await apiUsersClient.getUsers(orgAdminToken, testOrgId, {
        search: 'new-user',
      });

      // ASSERT: Search returns matching users
      expect(searchResponse.status).toBe(200);
      const users = searchResponse.body.data;
      expect(users.length).toBeGreaterThanOrEqual(1);
      const foundUser = users.find((u: any) => u.email.includes('new-user'));
      expect(foundUser).toBeDefined();
    });

    it('should enforce data isolation - admin cannot see users from other orgs', async () => {
      // ACT: List users from testOrg perspective
      const testOrgUsersResponse = await apiUsersClient.getUsers(orgAdminToken, testOrgId);

      // ASSERT: testOrg admin cannot see otherOrg users
      const testOrgUsers = testOrgUsersResponse.body.data;
      const crossOrgUser = testOrgUsers.find((u: any) => u.id === otherOrgUserId);
      expect(crossOrgUser).toBeUndefined();

      // ACT: List users from otherOrg perspective
      const otherOrgUsersResponse = await apiUsersClient.getUsers(otherOrgAdminToken, otherOrgId);

      // ASSERT: otherOrg admin cannot see testOrg users
      const otherOrgUsers = otherOrgUsersResponse.body.data;
      const testOrgUser = otherOrgUsers.find((u: any) => u.id === createdUserId);
      expect(testOrgUser).toBeUndefined();
    });

    it('should allow admin to view detailed user information', async () => {
      // ACT: Get user details
      const userDetailResponse = await apiUsersClient.getUserById(orgAdminToken, testOrgId, createdUserId);

      // ASSERT: Full user details returned
      expect(userDetailResponse.status).toBe(200);
      expect(userDetailResponse.body.id).toBe(createdUserId);
      expect(userDetailResponse.body.email).toBe('new-user@lifecycle-test.com');
      expect(userDetailResponse.body.firstName).toBe('New');
      expect(userDetailResponse.body.lastName).toBe('User');
      expect(userDetailResponse.body.status).toBe(UserStatus.PENDING);
      expect(userDetailResponse.body.memberships).toBeInstanceOf(Array);
      expect(userDetailResponse.body.memberships.length).toBeGreaterThanOrEqual(1);
    });

    it('should prevent admin from viewing users from other organizations', async () => {
      // ACT: Attempt to view user from other org
      const unauthorizedResponse = await apiUsersClient.getUserById(orgAdminToken, testOrgId, otherOrgUserId);

      // ASSERT: Access denied
      expect(unauthorizedResponse.status).toBe(404); // Not found (user doesn't exist in their org)
    });

    it('should allow admin to update user profile information', async () => {
      // ARRANGE: Prepare update data
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      // ACT: Update user
      const updateResponse = await apiUsersClient.withAuth(orgAdminToken).patch(
        `/organizations/${testOrgId}/users/${createdUserId}`,
        updateData
      );

      // ASSERT: User updated successfully
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.firstName).toBe('Updated');
      expect(updateResponse.body.lastName).toBe('Name');

      // Verify UserProfileUpdated event was published
      const profileUpdatedEvent = await eventListener.waitForEvent(EVENT_TYPES.USERS_USER_PROFILE_UPDATED, {
        predicate: (event: any) => event.payload.userId === createdUserId,
        timeout: 5000,
      });
      expect(profileUpdatedEvent).toBeDefined();
      expect(profileUpdatedEvent.payload.updatedFields).toContain('firstName');
      expect(profileUpdatedEvent.payload.updatedFields).toContain('lastName');
    });

    it('should allow admin to change user status and publish event', async () => {
      // ARRANGE: Prepare status change
      const updateData = {
        status: UserStatus.ACTIVE,
      };

      // ACT: Change status from PENDING to ACTIVE
      const updateResponse = await apiUsersClient.withAuth(orgAdminToken).patch(
        `/organizations/${testOrgId}/users/${createdUserId}`,
        updateData
      );

      // ASSERT: Status updated successfully
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe(UserStatus.ACTIVE);

      // Verify UserStatusChanged event was published
      const statusChangedEvent = await eventListener.waitForEvent(EVENT_TYPES.USERS_USER_STATUS_CHANGED, {
        predicate: (event: any) => event.payload.userId === createdUserId,
        timeout: 5000,
      });
      expect(statusChangedEvent).toBeDefined();
      expect(statusChangedEvent.payload.oldStatus).toBe(UserStatus.PENDING);
      expect(statusChangedEvent.payload.newStatus).toBe(UserStatus.ACTIVE);
      expect(statusChangedEvent.payload.organizationId).toBe(testOrgId);
    });

    it('should prevent admin from updating users from other organizations', async () => {
      // ARRANGE: Prepare update data
      const updateData = {
        firstName: 'Hacked',
      };

      // ACT: Attempt to update user from other org
      const unauthorizedResponse = await apiUsersClient.withAuth(orgAdminToken).patch(
        `/organizations/${testOrgId}/users/${otherOrgUserId}`,
        updateData,
      );

      // ASSERT: Access denied
      expect(unauthorizedResponse.status).toBe(404); // Not found (user doesn't exist in their org)
    });

    it('should allow admin to deactivate (soft delete) a user', async () => {
      // ACT: Deactivate user
      const deleteResponse = await apiUsersClient.withAuth(orgAdminToken).delete(
        `/organizations/${testOrgId}/users/${createdUserId}`
      );

      // ASSERT: User deactivated successfully
      expect(deleteResponse.status).toBe(204); // No content

      // Verify user status changed to INACTIVE in database
      const [userRecord] = await usersDb.getDataSource().query('SELECT status FROM users WHERE id = $1', [
        createdUserId,
      ]);
      expect(userRecord.status).toBe(UserStatus.INACTIVE);

      // Verify UserStatusChanged event was published
      const statusChangedEvent = await eventListener.waitForEvent(EVENT_TYPES.USERS_USER_STATUS_CHANGED, {
        predicate: (event: any) => event.payload.userId === createdUserId && event.payload.newStatus === UserStatus.INACTIVE,
        timeout: 5000,
      });
      expect(statusChangedEvent).toBeDefined();
      expect(statusChangedEvent.payload.oldStatus).toBe(UserStatus.ACTIVE);
      expect(statusChangedEvent.payload.newStatus).toBe(UserStatus.INACTIVE);
    });
  });

  describe('Scenario 2: Stable Data Journey', () => {
    let platformAdminToken: string;
    let stableOrgId: string;
    let stableOrgAdminEmail: string;
    let stableOrgAdminToken: string;

    beforeAll(async () => {
      // ARRANGE: Seed platform admin if not exists
      const platformAdmin = await seedPlatformAdmin(usersDb.getDataSource());

      // Login as platform admin (null org for platform context)
      await apiUsersClient.login(platformAdmin.user.email, platformAdmin.password);
      const platformTokenResponse = await apiUsersClient.getToken(null);
      platformAdminToken = platformTokenResponse.body.accessToken;

      // Create a stable organization with admin for testing
      const stableOrgResult = await onboardAdmin(
        orgsDb.getDataSource(),
        usersDb.getDataSource(),
        {
          organizationName: 'Stable Org for Testing',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          adminEmail: 'stable-admin@test.com',
          adminFirstName: 'Stable',
          adminLastName: 'Admin',
        },
      );

      stableOrgId = stableOrgResult.organization.id;
      stableOrgAdminEmail = stableOrgResult.admin.email;

      // Get token for stable org admin
      await apiUsersClient.login(stableOrgAdminEmail, stableOrgResult.admin.password);
      const orgTokenResponse = await apiUsersClient.getToken(stableOrgId);
      stableOrgAdminToken = orgTokenResponse.body.accessToken;
    });

    beforeEach(() => {
      // Clear captured events before each test
      eventListener.clearEvents();
    });

    it('should allow platform admin to list all users across all organizations', async () => {
      // ACT: Platform admin lists all users (using platform context)
      const listResponse = await apiUsersClient.getUsersOps(platformAdminToken, {
        page: 1,
        pageSize: 50,
      });

      // ASSERT: Platform admin sees users from all orgs
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toBeInstanceOf(Array);
      expect(listResponse.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should allow listing users with all filters combined', async () => {
      // ACT: Search with multiple filters in stable org
      const searchResponse = await apiUsersClient.getUsers(stableOrgAdminToken, stableOrgId, {
        page: 1,
        pageSize: 5,
        status: UserStatus.ACTIVE,
        search: stableOrgAdminEmail.substring(0, 6),
      });

      // ASSERT: Filters applied correctly
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.data).toBeInstanceOf(Array);
      expect(searchResponse.body.data.length).toBeGreaterThanOrEqual(1);
      const foundAdmin = searchResponse.body.data.find((u: any) => u.email === stableOrgAdminEmail);
      expect(foundAdmin).toBeDefined();
    });
  });
});