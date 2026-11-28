import { DataSource } from 'typeorm';
import { DebtorVerificationStatus } from '@verichron/enums';
import {
  createDebtorProfileFactory,
  type DebtorProfile,
} from '../factories';

/**
 * Seed: Debtor Multi-Organization Access Scenario
 *
 * Creates a test scenario where a single debtor profile is associated with a primary organization.
 * Multi-organization access for debtor users is managed through user_memberships in api-users.
 *
 * Scenario Setup:
 * - 1 debtor profile with primary organization
 * - User memberships in api-users determine which organizations the debtor user can access
 *
 * Expected Test Behavior:
 * - Debtor profile belongs to primary organization (organizationId field)
 * - User can access data from organizations they have memberships for (via api-users)
 * - Access is properly isolated per organization
 *
 * @example
 * ```typescript
 * const scenario = await seedDebtorMultiOrgAccess(debtorsDataSource, {
 *   userId: debtorUser.id,
 *   organizationIds: [orgA.id, orgB.id, orgC.id],
 * });
 *
 * expect(scenario.debtor.organizationId).toBe(orgA.id); // Primary org
 * expect(scenario.organizationIds).toEqual([orgA.id, orgB.id, orgC.id]);
 * ```
 */

export interface SeedDebtorMultiOrgAccessOptions {
  userId?: string;
  organizationIds: string[];
  firstName?: string;
  lastName?: string;
  verificationStatus?: DebtorVerificationStatus;
}

export interface DebtorMultiOrgAccessScenario {
  debtor: DebtorProfile;
  organizationIds: string[];
}

export async function seedDebtorMultiOrgAccess(
  dataSource: DataSource,
  options: SeedDebtorMultiOrgAccessOptions,
): Promise<DebtorMultiOrgAccessScenario> {
  const debtorFactory = createDebtorProfileFactory(dataSource);

  // Create the debtor profile (first organization is the primary owner)
  let debtor: DebtorProfile;
  if (options.userId) {
    const result = await debtorFactory.createDebtorProfileWithUser(options.userId, {
      firstName: options.firstName,
      lastName: options.lastName,
      organizationId: options.organizationIds[0],
      verificationStatus: options.verificationStatus || DebtorVerificationStatus.VERIFIED,
    });
    debtor = result.profile;
  } else {
    debtor = await debtorFactory.createDebtorProfile({
      firstName: options.firstName,
      lastName: options.lastName,
      organizationId: options.organizationIds[0],
      verificationStatus: options.verificationStatus || DebtorVerificationStatus.VERIFIED,
    });
  }

  // Note: Multi-org access is managed through user_memberships in api-users
  // The debtor user should have memberships for all organizationIds

  return {
    debtor,
    organizationIds: options.organizationIds,
  };
}
