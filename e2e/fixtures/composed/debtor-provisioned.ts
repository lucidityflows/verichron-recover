import { OrganizationStatus, OrganizationType, EmailCategory, UserStatus } from '@verichron/enums';
import { DataSource } from 'typeorm';
import { createOrganizationFactory } from '../api-organizations/factories/organizationFactory';
import { seedDebtor } from '../api-users/seed/seed';

/**
 * Composed Fixture: Debtor Provisioned
 * Creates debtor users with multi-organization access
 */

export interface DebtorProvisionedOptions {
  // Debtor options
  debtorEmail?: string;
  debtorPassword?: string;
  debtorFirstName?: string;
  debtorLastName?: string;

  // Organization options
  organizationCount?: number;
  organizationNames?: string[];

  // Profile options
  withProfile?: boolean;
}

export interface ProvisionedDebtor {
  debtor: {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: string;
    organizationIds: string[];
    organizationNames: string[];
    debtorPermissions: string[];
  };
  organizations: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

/**
 * Provision a debtor user with access to multiple organizations
 * Simulates a debtor invited to manage their debts across multiple agencies
 */
export async function provisionDebtor(
  orgDataSource: DataSource,
  userDataSource: DataSource,
  options: DebtorProvisionedOptions = {},
): Promise<ProvisionedDebtor> {
  const organizationCount = options.organizationCount ?? 2;
  const organizationNames = options.organizationNames ?? [];

  // Step 1: Create organizations
  const orgFactory = createOrganizationFactory(orgDataSource);
  const organizations = [];

  for (let i = 0; i < organizationCount; i++) {
    const org = await orgFactory.createOrganization({
      name: organizationNames[i],
      organizationType: OrganizationType.COLLECTION_AGENCY,
      status: OrganizationStatus.ACTIVE,
    });

    organizations.push({
      id: org.id,
      name: org.name,
      status: org.status,
    });
  }

  // Step 2: Create debtor with multi-org access
  const organizationIds = organizations.map((org) => org.id);
  const orgNames = organizations.map((org) => org.name);

  const debtor = await seedDebtor(userDataSource, organizationIds, orgNames, {
    email: options.debtorEmail,
    password: options.debtorPassword,
    firstName: options.debtorFirstName,
    lastName: options.debtorLastName,
    status: UserStatus.ACTIVE,
    withProfile: options.withProfile,
  });

  return {
    debtor: {
      id: debtor.user.id,
      email: debtor.user.email,
      password: debtor.password,
      firstName: debtor.user.firstName,
      lastName: debtor.user.lastName,
      roleId: debtor.roleId,
      organizationIds: debtor.organizationIds,
      organizationNames: debtor.organizationNames,
      debtorPermissions: debtor.debtorPermissions,
    },
    organizations,
  };
}

/**
 * Provision multiple debtors across the same set of organizations
 * Useful for testing multi-debtor scenarios
 */
export async function provisionMultipleDebtors(
  orgDataSource: DataSource,
  userDataSource: DataSource,
  options: DebtorProvisionedOptions & {
    debtorCount?: number;
  } = {},
): Promise<{
  debtors: ProvisionedDebtor['debtor'][];
  organizations: ProvisionedDebtor['organizations'];
}> {
  const debtorCount = options.debtorCount ?? 3;
  const organizationCount = options.organizationCount ?? 2;

  // Create organizations once
  const orgFactory = createOrganizationFactory(orgDataSource);
  const organizations = [];

  for (let i = 0; i < organizationCount; i++) {
    const org = await orgFactory.createOrganization({
      organizationType: OrganizationType.COLLECTION_AGENCY,
      status: OrganizationStatus.ACTIVE,
    });

    organizations.push({
      id: org.id,
      name: org.name,
      status: org.status,
    });
  }

  // Create multiple debtors with access to all organizations
  const organizationIds = organizations.map((org) => org.id);
  const orgNames = organizations.map((org) => org.name);
  const debtors = [];

  for (let i = 0; i < debtorCount; i++) {
    const debtor = await seedDebtor(userDataSource, organizationIds, orgNames, {
      status: UserStatus.ACTIVE,
      withProfile: options.withProfile,
    });

    debtors.push({
      id: debtor.user.id,
      email: debtor.user.email,
      password: debtor.password,
      firstName: debtor.user.firstName,
      lastName: debtor.user.lastName,
      roleId: debtor.roleId,
      organizationIds: debtor.organizationIds,
      organizationNames: debtor.organizationNames,
      debtorPermissions: debtor.debtorPermissions,
    });
  }

  return {
    debtors,
    organizations,
  };
}

/**
 * Provision a debtor with partial organization access
 * Useful for testing access control when debtor is added/removed from orgs
 */
export async function provisionDebtorWithPartialAccess(
  orgDataSource: DataSource,
  userDataSource: DataSource,
  options: DebtorProvisionedOptions & {
    totalOrganizations?: number;
    accessibleOrganizations?: number;
  } = {},
): Promise<{
  debtor: ProvisionedDebtor['debtor'];
  accessibleOrganizations: ProvisionedDebtor['organizations'];
  inaccessibleOrganizations: ProvisionedDebtor['organizations'];
}> {
  const totalOrganizations = options.totalOrganizations ?? 4;
  const accessibleOrganizations = options.accessibleOrganizations ?? 2;

  // Create all organizations
  const orgFactory = createOrganizationFactory(orgDataSource);
  const allOrganizations = [];

  for (let i = 0; i < totalOrganizations; i++) {
    const org = await orgFactory.createOrganization({
      organizationType: OrganizationType.COLLECTION_AGENCY,
      status: OrganizationStatus.ACTIVE,
    });

    allOrganizations.push({
      id: org.id,
      name: org.name,
      status: org.status,
    });
  }

  // Split into accessible and inaccessible
  const accessible = allOrganizations.slice(0, accessibleOrganizations);
  const inaccessible = allOrganizations.slice(accessibleOrganizations);

  // Create debtor with access to only first N organizations
  const organizationIds = accessible.map((org) => org.id);
  const orgNames = accessible.map((org) => org.name);

  const debtor = await seedDebtor(userDataSource, organizationIds, orgNames, {
    email: options.debtorEmail,
    password: options.debtorPassword,
    firstName: options.debtorFirstName,
    lastName: options.debtorLastName,
    status: UserStatus.ACTIVE,
    withProfile: options.withProfile,
  });

  return {
    debtor: {
      id: debtor.user.id,
      email: debtor.user.email,
      password: debtor.password,
      firstName: debtor.user.firstName,
      lastName: debtor.user.lastName,
      roleId: debtor.roleId,
      organizationIds: debtor.organizationIds,
      organizationNames: debtor.organizationNames,
      debtorPermissions: debtor.debtorPermissions,
    },
    accessibleOrganizations: accessible,
    inaccessibleOrganizations: inaccessible,
  };
}
