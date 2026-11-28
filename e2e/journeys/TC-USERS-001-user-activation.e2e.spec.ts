/**
 * @system-rule R-USERS-001
 * @description New Organization User Completes Activation Flow
 *
 * This test validates the user activation journey where an invited user
 * sets their password and transitions from PENDING to ACTIVE status.
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
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import { onboardAdmin } from '../fixtures/composed/onboard-admin';
import { createEventListenerHelper, EventListenerHelper } from '../helpers/event-listener.helper';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import { UserStatus, OrganizationType } from '@verichron/enums';

describe('TC-USERS-001: User Activation Flow', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let apiUsersClient: ApiUsersClient;
  let eventListener: EventListenerHelper;

  let platformAdminToken: string;
  let organizationId: string;
  let adminToken: string;
  let adminRoleId: string;

  beforeAll(async () => {
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();

    apiUsersClient = createApiUsersClient();
    eventListener = await createEventListenerHelper();
    await eventListener.startListening(EVENT_TOPICS.USERS);

    // Setup platform admin
    const platformAdmin = await seedPlatformAdmin(usersDb.getDataSource());
    await apiUsersClient.login(platformAdmin.user.email, platformAdmin.password);
    const tokenResponse = await apiUsersClient.getToken(null);
    platformAdminToken = tokenResponse.body.accessToken;

    // Onboard an organization for testing
    const onboardResult = await onboardAdmin(
      orgsDb.getDataSource(),
      usersDb.getDataSource(),
      {
        organizationName: 'Activation Test Org',
        organizationType: OrganizationType.COLLECTION_AGENCY,
      }
    );
    organizationId = onboardResult.organization.id;
    adminRoleId = onboardResult.role.id;

    // Login as org admin
    await apiUsersClient.login(onboardResult.admin.email, onboardResult.admin.password);
    const adminTokenResponse = await apiUsersClient.getToken(organizationId);
    adminToken = adminTokenResponse.body.accessToken;

    console.log('✅ Test setup complete');
  }, 60000);

  afterAll(async () => {
    await eventListener?.stopAll();
    await usersDb.disconnect();
    await orgsDb.disconnect();
  });

  it('should allow a new user to activate their account with a valid token', async () => {
    const newUserEmail = `new-user-${Date.now()}@test.com`;
    const password = 'NewPassword123!';

    // 1. Admin creates user (Step 1 of invite)
    const createUserResponse = await apiUsersClient.withAuth(adminToken).post(
      `/organizations/${organizationId}/users`,
      {
        email: newUserEmail,
        firstName: 'New',
        lastName: 'User',
        roleId: adminRoleId,
      }
    );
    expect(createUserResponse.status).toBe(201);
    const userId = createUserResponse.body.id;

    // 2. Capture invitation event to get token
    const userCreatedEvent = await eventListener.waitForEvent(EVENT_TYPES.USERS_USER_CREATED, {
      predicate: (e) => e.payload.userId === userId,
    });
    const invitationToken = userCreatedEvent.payload.invitationToken;
    expect(invitationToken).toBeDefined();

    // 3. User activates account
    const activateResponse = await apiUsersClient.activateUser({
      invitationToken,
      password,
      passwordConfirmation: password,
    });
    expect(activateResponse.status).toBe(200);

    // 4. Verify user is now ACTIVE in database
    const [user] = await usersDb.query('SELECT status FROM users WHERE id = $1', [userId]);
    expect(user.status).toBe(UserStatus.ACTIVE);

    // 5. Verify user can now login
    const loginResponse = await apiUsersClient.login(newUserEmail, password);
    expect(loginResponse.status).toBe(201);
  });

  it('should reject activation with an invalid token', async () => {
    const activateResponse = await apiUsersClient.activateUser({
      invitationToken: 'invalid-token',
      password: 'SomePassword123!',
      passwordConfirmation: 'SomePassword123!',
    });
    expect(activateResponse.status).toBe(400);
  });

  it('should reject activation if password and confirmation do not match', async () => {
    const newUserEmail = `mismatch-${Date.now()}@test.com`;
    
    await apiUsersClient.withAuth(adminToken).post(
      `/organizations/${organizationId}/users`,
      {
        email: newUserEmail,
        firstName: 'Mismatch',
        lastName: 'User',
        roleId: adminRoleId,
      }
    );

    const userCreatedEvent = await eventListener.waitForEvent(EVENT_TYPES.USERS_USER_CREATED, {
      predicate: (e) => e.payload.email === newUserEmail,
    });

    const activateResponse = await apiUsersClient.activateUser({
      invitationToken: userCreatedEvent.payload.invitationToken,
      password: 'Password123!',
      passwordConfirmation: 'Mismatch123!',
    });
    expect(activateResponse.status).toBe(400);
  });
});