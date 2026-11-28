import { DataSource } from 'typeorm';
import { DebtorVerificationStatus } from '@verichron/enums';
import {
  createDebtorProfileFactory,
  createDebtorContactFactory,
  type DebtorProfile,
  type DebtorPhone,
  type DebtorEmail,
  type DebtorAddress,
} from '../factories';

/**
 * Seed: Complete Debtor Profile Scenario
 *
 * Creates a fully populated debtor profile with all contact information and
 * organization access. Perfect for testing complete debtor workflows.
 *
 * Scenario Setup:
 * - 1 verified debtor profile
 * - Primary phone (mobile, verified)
 * - Primary email (verified)
 * - Primary home address (verified)
 * - Organization access granted (configurable)
 *
 * Expected Test Behavior:
 * - Debtor has complete, verified contact information
 * - Debtor is accessible by specified organization(s)
 * - All contact methods are verified and active
 *
 * @example
 * ```typescript
 * const scenario = await seedCompleteDebtorProfile(debtorsDataSource, {
 *   userId: debtorUser.id,
 *   organizationId: org.id,
 * });
 *
 * expect(scenario.debtor.verificationStatus).toBe('VERIFIED');
 * expect(scenario.phone.isPrimary).toBe(true);
 * expect(scenario.email.isVerified).toBe(true);
 * expect(scenario.address.addressType).toBe('HOME');
 * ```
 */

export interface SeedCompleteDebtorProfileOptions {
  userId?: string;
  organizationId: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  emailAddress?: string;
}

export interface CompleteDebtorProfileScenario {
  debtor: DebtorProfile;
  phone: DebtorPhone;
  email: DebtorEmail;
  address: DebtorAddress;
}

export async function seedCompleteDebtorProfile(
  dataSource: DataSource,
  options: SeedCompleteDebtorProfileOptions,
): Promise<CompleteDebtorProfileScenario> {
  const debtorFactory = createDebtorProfileFactory(dataSource);
  const contactFactory = createDebtorContactFactory(dataSource);

  // Create verified debtor
  let debtor: DebtorProfile;
  if (options.userId) {
    const result = await debtorFactory.createDebtorProfileWithUser(options.userId, {
      firstName: options.firstName,
      lastName: options.lastName,
      organizationId: options.organizationId,
      verificationStatus: DebtorVerificationStatus.VERIFIED,
      lastVerifiedAt: new Date(),
    });
    debtor = result.profile;
  } else {
    debtor = await debtorFactory.createVerifiedDebtorProfile({
      firstName: options.firstName,
      lastName: options.lastName,
      organizationId: options.organizationId,
    });
  }

  // Create complete contact profile
  const phone = await contactFactory.createPrimaryMobilePhone(debtor.id, options.phoneNumber);
  const email = await contactFactory.createPrimaryEmail(debtor.id, options.emailAddress);
  const address = await contactFactory.createPrimaryHomeAddress(debtor.id);

  return {
    debtor,
    phone,
    email,
    address,
  };
}
