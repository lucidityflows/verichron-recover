/**
 * @system-rule R-DEBTOR-INVITE-001
 * @description Cannot Invite Debtor with Mismatched debtorId - Email Uniqueness
 */

import {
  createUsersDbHelper,
  createOrganizationsDbHelper,
  createDebtorsDbHelper,
  DatabaseHelper,
} from '../helpers/database.helper';
import {
  ApiUsersClient,
  ApiOrganizationsClient,
  ApiDebtorsClient,
  createApiUsersClient,
  createApiOrganizationsClient,
  createApiDebtorsClient,
} from '../helpers/api-client.helper';
import { seedOrganizationAdmin } from '../fixtures/api-users/seed/seed';
import { createOrganizationFactory } from '../fixtures/api-organizations/factories/organizationFactory';
import { createDebtorProfileFactory, DebtorProfileFactory } from '../fixtures/api-debtors/factories/debtorFactory';
import { OrganizationStatus } from '@verichron/enums';

describe('TC-DBT-INVITE-003: Cannot Invite Debtor with Mismatched debtorId', () => {
  let usersDb: DatabaseHelper;
  let orgsDb: DatabaseHelper;
  let debtorsDb: DatabaseHelper;
  let apiUsersClient: ApiUsersClient;
  let apiOrganizationsClient: ApiOrganizationsClient;
  let apiDebtorsClient: ApiDebtorsClient;
  let debtorProfileFactory: DebtorProfileFactory;

  beforeAll(async () => {
    usersDb = createUsersDbHelper();
    orgsDb = createOrganizationsDbHelper();
    debtorsDb = createDebtorsDbHelper();
    await usersDb.connect();
    await orgsDb.connect();
    await debtorsDb.connect();

    apiUsersClient = createApiUsersClient();
    apiOrganizationsClient = createApiOrganizationsClient();
    apiDebtorsClient = createApiDebtorsClient();

    console.log('✅ Test setup complete');
  });

  afterAll(async () => {
    await usersDb.disconnect();
    await orgsDb.disconnect();
    await debtorsDb.disconnect();
  });

  describe('Scenario 1: Fresh Data Journey - Email Already Linked to Different Debtor', () => {
    let orgAId: string;
    let orgAdminJwt: string;
    let debtorProfileAId: string;
    let debtorProfileBId: string;
    const conflictEmail = 'john.doe@email.com';

    beforeAll(async () => {
      await usersDb.cleanAllTables();
      await orgsDb.cleanAllTables();
      await debtorsDb.cleanAllTables();

      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const orgA = await orgFactory.createCollectionAgency({
        name: 'Collection Agency A',
        status: OrganizationStatus.ACTIVE,
      });
      orgAId = orgA.id;

      const orgAdmin = await seedOrganizationAdmin(
        usersDb.getDataSource(),
        orgAId,
        orgA.name,
        {
          email: 'admin@agency-a.com',
          password: 'Admin123!',
        },
      );

      await apiUsersClient.login(orgAdmin.user.email, orgAdmin.password);
      const tokenResponse = await apiUsersClient.getToken(orgAId);
      orgAdminJwt = tokenResponse.body.accessToken;

      debtorProfileFactory = createDebtorProfileFactory(debtorsDb.getDataSource());

      const debtorA = await debtorProfileFactory.createDebtorProfile({
        organizationId: orgAId,
        firstName: 'John',
        lastName: 'Doe',
      });
      debtorProfileAId = debtorA.id;

      const debtorB = await debtorProfileFactory.createDebtorProfile({
        organizationId: orgAId,
        firstName: 'Jane',
        lastName: 'Smith',
      });
      debtorProfileBId = debtorB.id;
    });

    it('should reject invitation when email already linked to different debtorId', async () => {
      const firstInvite = await apiDebtorsClient.inviteDebtor(
        orgAdminJwt,
        orgAId,
        debtorProfileAId,
        {
          email: conflictEmail,
          firstName: 'John',
          lastName: 'Doe',
        }
      );

      expect(firstInvite.status).toBe(201);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const secondInvite = await apiDebtorsClient.inviteDebtor(
        orgAdminJwt,
        orgAId,
        debtorProfileBId,
        {
          email: conflictEmail, 
          firstName: 'Jane',
          lastName: 'Smith',
        }
      );

      expect([400, 409]).toContain(secondInvite.status);
    });

    it('should include clear error message explaining the conflict', async () => {
      const email = 'conflict-test@email.com';
      await apiDebtorsClient.inviteDebtor(
        orgAdminJwt,
        orgAId,
        debtorProfileAId,
        {
          email,
          firstName: 'John',
          lastName: 'Doe',
        }
      );

      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await apiDebtorsClient.inviteDebtor(
        orgAdminJwt,
        orgAId,
        debtorProfileBId,
        {
          email,
          firstName: 'Jane',
          lastName: 'Smith',
        }
      );

      expect([400, 409]).toContain(response.status);
      expect(response.body.message).toBeTruthy();
    });
  });

  describe('Scenario 2: Stable Data Journey - Cross-Organization Email Conflicts', () => {
    let orgAId: string;
    let orgBId: string;
    let orgAdminJwt: string;
    let orgBAdminJwt: string;
    let debtorProfileAId: string;
    let debtorProfileCId: string;
    const globalEmail = 'global-unique@email.com';

    beforeAll(async () => {
      const orgFactory = createOrganizationFactory(orgsDb.getDataSource());
      const orgA = await orgFactory.createCollectionAgency({
        name: 'Agency A Scenario 2',
        status: OrganizationStatus.ACTIVE,
      });
      orgAId = orgA.id;

      const orgAAdmin = await seedOrganizationAdmin(usersDb.getDataSource(), orgAId, orgA.name, {
        email: 'admin-a-s2@agency-a.com',
        password: 'Admin123!',
      });

      await apiUsersClient.login(orgAAdmin.user.email, orgAAdmin.password);
      const tokenA = await apiUsersClient.getToken(orgAId);
      orgAdminJwt = tokenA.body.accessToken;

      const debtorA = await debtorProfileFactory.createDebtorProfile({
        organizationId: orgAId,
        firstName: 'John',
        lastName: 'Doe',
      });
      debtorProfileAId = debtorA.id;

      const orgB = await orgFactory.createCollectionAgency({
        name: 'Agency B Scenario 2',
        status: OrganizationStatus.ACTIVE,
      });
      orgBId = orgB.id;

      const orgBAdmin = await seedOrganizationAdmin(usersDb.getDataSource(), orgBId, orgB.name, {
        email: 'admin-b-s2@agency-b.com',
        password: 'Admin123!',
      });

      await apiUsersClient.login(orgBAdmin.user.email, orgBAdmin.password);
      const tokenB = await apiUsersClient.getToken(orgBId);
      orgBAdminJwt = tokenB.body.accessToken;

      const debtorC = await debtorProfileFactory.createDebtorProfile({
        organizationId: orgBId,
        firstName: 'Charlie',
        lastName: 'Brown',
      });
      debtorProfileCId = debtorC.id;
    });

    it('should prevent same email from linking to debtors in different organizations', async () => {
      const orgAInvite = await apiDebtorsClient.inviteDebtor(
        orgAdminJwt,
        orgAId,
        debtorProfileAId,
        {
          email: globalEmail,
          firstName: 'John',
          lastName: 'Doe',
        }
      );

      expect(orgAInvite.status).toBe(201);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const orgBInvite = await apiDebtorsClient.inviteDebtor(
        orgBAdminJwt,
        orgBId,
        debtorProfileCId,
        {
          email: globalEmail,
          firstName: 'Charlie',
          lastName: 'Brown',
        }
      );

      expect([400, 409]).toContain(orgBInvite.status);
    });
  });
});