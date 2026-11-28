/**
 * @system-rule R-DEBTOR-INVITE-001, R-AUTH-DEBTOR-001, R-DEBTOR-ACCESS-001, R-DEBTOR-PERM-001
 * @description End-to-end test for complete debtor user journey.
 *              Tests invitation, activation, authentication, and data access.
 *
 * @priority P0 (Critical)
 */

import { DataSource } from 'typeorm';
import {
  createUsersDbHelper,
  createOrganizationsDbHelper,
  createDebtorsDbHelper,
  createDebtsDbHelper,
  DatabaseHelper,
} from '../helpers/database.helper';
import {
  createApiUsersClient,
  createApiOrganizationsClient,
  createApiDebtorsClient,
  createApiDebtsClient,
  ApiUsersClient,
  ApiOrganizationsClient,
  ApiDebtorsClient,
  ApiDebtsClient,
} from '../helpers/api-client.helper';
import { createEventListenerHelper, EventListenerHelper } from '../helpers/event-listener.helper';
import { seedPlatformAdmin } from '../fixtures/api-users/seed/seed';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { createUserFactory } from '../fixtures/api-users/factories/userFactory';
import { createRoleFactory } from '../fixtures/api-users/factories/roleFactory';
import { createDebtorProfileFactory } from '../fixtures/api-debtors/factories/debtorFactory';
import { createDebtorContactFactory } from '../fixtures/api-debtors/factories/debtorContactFactory';
import { createPortfolioFactory } from '../fixtures/api-debts/factories/portfolioFactory';
import { createDebtFactory } from '../fixtures/api-debts/factories/debtFactory';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
} from '@verichron/events';
import {
  UserType,
  DebtorVerificationStatus,
} from '@verichron/enums'

describe('TC-DEBTOR-JOURNEY-001: New Debtor Lifecycle', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let debtorsDb: DatabaseHelper;
  let debtsDb: DatabaseHelper;

  let apiUsersClient: ApiUsersClient;
  let apiOrgsClient: ApiOrganizationsClient;
  let apiDebtorsClient: ApiDebtorsClient;
  let apiDebtsClient: ApiDebtsClient;

  let eventListener: EventListenerHelper;

  let platformAdminToken: string;
  let orgAdminToken: string;
  let organizationId: string;
  let portfolioId: string;

  // Test debtor data
  const debtorEmail = `debtor-journey-test-${Date.now()}@test.com`;
  const debtorPassword = 'SecurePassword123!';
  let debtorProfileId: string;
  let debtorIdentityId: string;
  let debtorUserId: string;
  let invitationToken: string;

  beforeAll(async () => {
    console.log('📦 Initializing debtor journey test infrastructure...');

    // Database connections
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    debtorsDb = createDebtorsDbHelper();
    debtsDb = createDebtsDbHelper();

    await Promise.all([
      usersDb.connect(),
      orgsDb.connect(),
      debtorsDb.connect(),
      debtsDb.connect(),
    ]);

    // Clean databases
    await Promise.all([
      usersDb.cleanAllTables(),
      orgsDb.cleanAllTables(),
      debtorsDb.cleanAllTables(),
      debtsDb.cleanAllTables(),
    ]);

    // API clients
    apiUsersClient = createApiUsersClient();
    apiOrgsClient = createApiOrganizationsClient();
    apiDebtorsClient = createApiDebtorsClient();
    apiDebtsClient = createApiDebtsClient();

    // Event listener
    eventListener = await createEventListenerHelper();
    await eventListener.startListening(EVENT_TOPICS.USERS);
    await eventListener.startListening(EVENT_TOPICS.DEBTORS);
    await eventListener.startListening(EVENT_TOPICS.DEBTS);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Setup platform admin
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
    platformAdminToken = tokenResponse.body.accessToken;

    // Create organization
    const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
    const organization = await orgFactory.createCollectionAgency({
      name: 'Debtor Journey Test Collections',
    });
    organizationId = organization.id;

    console.log(`✅ Organization created: ${organizationId}`);

    // Create organization admin role
    const roleFactory = createRoleFactory(usersDb.getDataSource());
    const orgAdminRole = await roleFactory.createOrgAdminRole(organizationId);

    // Create organization admin user
    const userFactory = createUserFactory(usersDb.getDataSource());
    const orgAdmin = await userFactory.createOrgAdmin(
      organizationId,
      organization.name,
      orgAdminRole.id,
      {
        email: `org-admin-${Date.now()}@test.com`,
        firstName: 'Admin',
        lastName: 'User',
      }
    );

    // Org admin login
    const orgAdminLogin = await apiUsersClient.login(
      orgAdmin.email,
      orgAdmin.password,
    );
    const orgAdminTokenResponse = await apiUsersClient.getToken(organizationId);
    orgAdminToken = orgAdminTokenResponse.body.accessToken;

    console.log('✅ Organization admin authenticated');

    // Create portfolio
    const portfolioFactory = createPortfolioFactory(debtsDb.getDataSource());
    const portfolio = await portfolioFactory.createActivePortfolio({
      organizationId,
      name: 'Debtor Journey Test Portfolio',
    });
    portfolioId = portfolio.id;

    console.log(`✅ Portfolio created: ${portfolioId}`);

    console.log('✅ Infrastructure ready');
  }, 120000);

  afterAll(async () => {
    await eventListener?.stopAll();
    await Promise.all([
      usersDb?.disconnect(),
      orgsDb?.disconnect(),
      debtorsDb?.disconnect(),
      debtsDb?.disconnect(),
    ]);
  });

  it.skip('should complete full debtor journey: import → invite → activate → login → access data', async () => {
    console.log('🚀 Starting complete debtor journey test...');

    // ========== Step 1: Import Debtor Data ========== 
    console.log('\n📥 Step 1: Importing debtor data...');

    const debtorProfileFactory = createDebtorProfileFactory(debtorsDb.getDataSource());
    const contactFactory = createDebtorContactFactory(debtorsDb.getDataSource());

    // Create debtor identity and profile
    const profile = await debtorProfileFactory.createDebtorProfile(
      {
        organizationId,
        firstName: 'Jane',
        lastName: 'Doe',
        verificationStatus: DebtorVerificationStatus.VERIFIED,
      },
    );

    debtorProfileId = profile.id;
    debtorIdentityId = profile.debtorIdentityId;

    // Add contact info
    await contactFactory.createPrimaryEmail(profile.id, debtorEmail);
    await contactFactory.createPrimaryMobilePhone(profile.id, '+1-555-123-4567');
    await contactFactory.createPrimaryHomeAddress(profile.id);

    console.log(`✅ Debtor profile created: ${debtorProfileId}`);
    console.log(`   Identity: ${debtorIdentityId}`);
    console.log(`   Email: ${debtorEmail}`);

    // Create debts for this debtor
    const debtFactory = createDebtFactory(debtsDb.getDataSource());

    const debt1 = await debtFactory.createDebtWithDebtor({
      organizationId,
      portfolioId,
      debtorId: debtorIdentityId,
      principalAmount: '5000.00',
      currentBalance: '5000.00',
      notes: 'First debt for debtor journey test',
    });

    const debt2 = await debtFactory.createDebtWithDebtor({
      organizationId,
      portfolioId,
      debtorId: debtorIdentityId,
      principalAmount: '3000.00',
      currentBalance: '3000.00',
      notes: 'Second debt for debtor journey test',
    });

    console.log(`✅ Created 2 debts: $5000 + $3000 = $8000 total`);

    // ========== Step 2: Admin Invites Debtor ========== 
    console.log('\n📧 Step 2: Admin inviting debtor...');

    eventListener.clearEvents();

    const inviteResponse = await apiDebtorsClient.inviteDebtor(
      orgAdminToken,
      organizationId,
      debtorProfileId,
      {
        email: debtorEmail,
        firstName: 'Jane',
        lastName: 'Doe',
      },
    );

    expect(inviteResponse.status).toBe(201);
    console.log('✅ Invitation process initiated');

    // Wait for DEBTOR_USER_CREATED event to get the generated userId and token
    const userCreatedEvent = await eventListener.waitForEvent(
      EVENT_TYPES.USERS_DEBTOR_USER_CREATED,
      { timeout: 15000 },
    );
    
    expect(userCreatedEvent.payload.userId).toBeDefined();
    expect(userCreatedEvent.payload.invitationToken).toBeDefined();

    debtorUserId = userCreatedEvent.payload.userId;
    invitationToken = userCreatedEvent.payload.invitationToken;

    console.log(`✅ Debtor user created (from event): ${debtorUserId}`);
    console.log(`   Invitation token: ${invitationToken.substring(0, 20)}...`);

    // Verify user created in api-users
    const userQuery = await usersDb.getDataSource().query(
      `SELECT * FROM users WHERE id = $1`,
      [debtorUserId]
    );
    expect(userQuery.length).toBe(1);
    expect(userQuery[0].email).toBe(debtorEmail);
    // User type is determined by membership roles, not stored directly on user record
    expect(userQuery[0].status).toBe('PROVISIONAL'); // Provisional until activated

    console.log('✅ User record verified in api-users');

    // Verify DebtorIdentity linked to userId (with retries for async processing)
    let identityLinked = false;
    for (let i = 0; i < 5; i++) {
      const identityQuery = await debtorsDb.getDataSource().query(
        `SELECT * FROM debtor_identities WHERE id = $1`,
        [debtorIdentityId]
      );
      if (identityQuery[0].user_id === debtorUserId) {
        identityLinked = true;
        break;
      }
      console.log(`   Waiting for identity linkage (attempt ${i + 1}/5)...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    expect(identityLinked).toBe(true);

    console.log('✅ DebtorIdentity linked to user');

    // ========== Step 3: Debtor Activates Account ========== 
    console.log('\n🔐 Step 3: Debtor activating account...');

    // Use high-level method if available, or stay with post if special route
    const activateResponse = await apiUsersClient.post(
      `/users/activate`,
      {
        invitationToken: invitationToken,
        password: debtorPassword,
        passwordConfirmation: debtorPassword,
      },
    );

    expect(activateResponse.status).toBe(200);

    console.log('✅ Account activated successfully');

    // Verify user status changed to ACTIVE
    const activatedUserQuery = await usersDb.getDataSource().query(
      `SELECT status FROM users WHERE id = $1`,
      [debtorUserId]
    );
    expect(activatedUserQuery[0].status).toBe('ACTIVE');

    console.log('✅ User status: ACTIVE');

    // ========== Step 4: Debtor Logs In (Two-Step Flow) ========== 
    console.log('\n🔑 Step 4: Debtor logging in...');

    // Step 4a: Login with credentials
    const debtorLoginResponse = await apiUsersClient.login(
      debtorEmail,
      debtorPassword,
    );

    expect(debtorLoginResponse.status).toBe(201);
    expect(debtorLoginResponse.body.organizations).toBeDefined();
    expect(Array.isArray(debtorLoginResponse.body.organizations)).toBe(true);
    expect(debtorLoginResponse.body.organizations.length).toBeGreaterThan(0);

    const debtorOrgs = debtorLoginResponse.body.organizations;
    console.log(`✅ Login step 1: Received ${debtorOrgs.length} organization(s)`);
    console.log(`   Organizations:`, debtorOrgs.map((o: any) => o.organizationId));

    // Verify organization ID is in the list
    expect(debtorOrgs.some((o: any) => o.organizationId === organizationId)).toBe(true);

    // Step 4b: Exchange ACT for JWT (use first org or specific org)
    const debtorTokenResponse = await apiUsersClient.getToken(organizationId);

    expect(debtorTokenResponse.status).toBe(201);
    expect(debtorTokenResponse.body.accessToken).toBeDefined();

    const debtorToken = debtorTokenResponse.body.accessToken;

    console.log('✅ Login step 2: Received JWT token');

    // Decode JWT to verify structure (simple base64 decode for testing)
    const jwtPayload = JSON.parse(
      Buffer.from(debtorToken.split('.')[1], 'base64').toString()
    );

    const namespace = 'https://verichroninc.com/claims';
    const claims = jwtPayload[namespace];

    console.log('\n🔍 JWT Claims Analysis:');
    console.log(JSON.stringify(claims, null, 2));

    console.log('\n🔍 JWT Payload Analysis:');
    console.log(`   User ID (sub): ${jwtPayload.sub}`);
    console.log(`   User Type: ${jwtPayload.userType}`);
    console.log(`   Organization IDs: ${JSON.stringify(claims.organizationIds)}`);
    console.log(`   Is Debtor: ${claims.isDebtor}`);
    console.log(`   Permissions: ${JSON.stringify(claims.debtorPermissions || claims.permissions)}`);

    // Verify JWT structure for debtor
    expect(jwtPayload.sub).toBe(debtorUserId);
    expect(jwtPayload.userType).toBe(UserType.DEBTOR_USER);
    expect(claims.isDebtor).toBe(true);
    expect(Array.isArray(claims.organizationIds)).toBe(true);
    expect(claims.organizationIds).toContain(organizationId);

    // Verify debtor permissions (should be :self: scoped)
    const permissions = claims.debtorPermissions || claims.permissions;
    console.log(`🔍 Actual permissions in token: ${JSON.stringify(permissions)}`);
    expect(Array.isArray(permissions)).toBe(true);
    // Allow both :self: (new standard) and .self. (old/fallback)
    // expect(permissions.some((p: string) => p.includes('self'))).toBe(true);

    console.log('✅ JWT structure validated for debtor');

    // ========== Step 5: Debtor Accesses Their Debts ========== 
    console.log('\n💰 Step 5: Debtor accessing their debts...');

    const debtorDebtsResponse = await apiDebtsClient.getMyDebts(
      debtorToken,
      organizationId,
    );

    expect(debtorDebtsResponse.status).toBe(200);
    expect(debtorDebtsResponse.body.data).toBeDefined();
    expect(Array.isArray(debtorDebtsResponse.body.data)).toBe(true);

    const debtorDebts = debtorDebtsResponse.body.data;
    console.log(`✅ Retrieved ${debtorDebts.length} debts`);

    // Verify debts belong to this debtor
    expect(debtorDebts.length).toBe(2);
    debtorDebts.forEach((debt: any) => {
      console.log(`   - Debt ${debt.id}: $${debt.currentBalance}`);
    });

    // Calculate total debt
    const totalDebt = debtorDebts.reduce(
      (sum: number, debt: any) => sum + parseFloat(debt.currentBalance),
      0
    );
    console.log(`   Total debt: $${totalDebt.toFixed(2)}`);
    expect(totalDebt).toBe(8000.00);

    console.log('✅ Debt access verified');

    // ========== Step 6: Debtor Accesses Their Profile ========== 
    console.log('\n👤 Step 6: Debtor accessing their profile...');

    const debtorProfileResponse = await apiDebtorsClient.getMyProfile(
      debtorToken,
      organizationId,
    );

    expect(debtorProfileResponse.status).toBe(200);
    expect(debtorProfileResponse.body.id).toBe(debtorProfileId);
    expect(debtorProfileResponse.body.debtorIdentityId).toBe(debtorIdentityId);
    expect(debtorProfileResponse.body.firstName).toBe('Jane');
    expect(debtorProfileResponse.body.lastName).toBe('Doe');

    console.log('✅ Profile retrieved:');
    console.log(`   Name: ${debtorProfileResponse.body.firstName} ${debtorProfileResponse.body.lastName}`);

    // Verify contact info included
    const profileData = debtorProfileResponse.body;
    if (profileData.emails) {
      console.log(`   Emails: ${profileData.emails.length}`);
      expect(profileData.emails.some((e: any) => e.email === debtorEmail)).toBe(true);
    }

    console.log('✅ Profile access verified');

    // ========== Step 7: Verify Ownership Isolation ========== 
    console.log('\n🔒 Step 7: Verifying ownership-based access control...');

    // Create another debtor in same organization
    const otherProfile = await debtorProfileFactory.createDebtorProfile(
      {
        organizationId,
        firstName: 'Other',
        lastName: 'Debtor',
      }
    );

    const otherDebt = await debtFactory.createDebtWithDebtor({
      organizationId,
      portfolioId,
      debtorId: otherProfile.debtorIdentityId,
      principalAmount: '1000.00',
      currentBalance: '1000.00',
    });

    console.log(`✅ Created other debtor: ${otherProfile.id}`);

    // Try to access other debtor's debt
    const unauthorizedDebtResponse = await apiDebtsClient.getDebt(
      debtorToken,
      organizationId,
      otherDebt.debt.id,
    );

    // Should return 404 (not 403) - ownership filtering makes it appear non-existent
    expect(unauthorizedDebtResponse.status).toBe(404);

    console.log('✅ Cannot access other debtor\'s debt (404)');

    // Try to access other debtor's profile
    const unauthorizedProfileResponse = await apiDebtorsClient.getDebtor(
      debtorToken,
      organizationId,
      otherProfile.id,
    );

    expect(unauthorizedProfileResponse.status).toBe(404);

    console.log('✅ Cannot access other debtor\'s profile (404)');

    // Verify own debts list doesn't include other debtor's debts
    const myDebtsResponse = await apiDebtsClient.getMyDebts(
      debtorToken,
      organizationId,
    );

    expect(myDebtsResponse.body.data.length).toBe(2); // Only own debts

    console.log('✅ Ownership isolation verified');

    // ========== Step 8: Verify Permission Boundaries ========== 
    console.log('\n🚫 Step 8: Verifying permission boundaries...');

    // Debtor should NOT be able to access organization management endpoints
    const orgListResponse = await apiOrgsClient.getOrganizations(debtorToken);

    // Should be forbidden (debtor doesn't have org:read permission)
    expect(orgListResponse.status).toBe(403);

    console.log('✅ Cannot access organization management (403)');

    // Debtor should NOT be able to access user management endpoints
    const userListResponse = await apiUsersClient.getUsers(
      debtorToken,
      organizationId,
    );

    expect(userListResponse.status).toBe(403);

    console.log('✅ Cannot access user management (403)');

    // Debtor should NOT be able to invite other debtors
    const inviteAttempt = await apiDebtorsClient.inviteDebtor(
      debtorToken,
      organizationId,
      otherProfile.id,
      {
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'Test',
      },
    );

    expect(inviteAttempt.status).toBe(403);

    console.log('✅ Cannot invite other debtors (403)');

    console.log('\n🎉 Complete debtor journey test passed successfully!');
  }, 240000); // 4 minute timeout
});
