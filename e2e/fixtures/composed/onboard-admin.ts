import { AddressCategory, PhoneCategory, EmailCategory, OrganizationStatus, OrganizationType } from '@verichron/enums';
import { DataSource } from 'typeorm';
import { createOrganizationFactory } from '../api-organizations/factories/organizationFactory';
import { createOrganizationProfileFactory } from '../api-organizations/factories/profileFactory';
import { createUserFactory } from '../api-users/factories/userFactory';
import { createRoleFactory } from '../api-users/factories/roleFactory';
import { createProfileFactory } from '../api-users/factories/profileFactory';

/**
 * Composed Fixture: Onboard Admin
 * Cross-service orchestration for creating organization with admin user
 */

export interface OnboardAdminOptions {
  // Organization options
  organizationName?: string;
  organizationType?: OrganizationType;
  organizationStatus?: OrganizationStatus;

  // Admin user options
  adminEmail?: string;
  adminPassword?: string;
  adminFirstName?: string;
  adminLastName?: string;

  // Profile options
  withOrgProfile?: boolean;
  withUserProfile?: boolean;

  // Creator context
  createdBy?: string;
}

export interface OnboardedAdmin {
  organization: {
    id: string;
    name: string;
    status: string;
  };
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  };
  role: {
    id: string;
    name: string;
  };
}

/**
 * Onboard an organization with its admin user
 * Creates organization in api-organizations and admin user in api-users
 */
export async function onboardAdmin(
  orgDataSource: DataSource,
  userDataSource: DataSource,
  options: OnboardAdminOptions = {},
): Promise<OnboardedAdmin> {
  // Step 1: Create organization
  const orgFactory = createOrganizationFactory(orgDataSource);
  const orgProfileFactory = createOrganizationProfileFactory(orgDataSource);

  const organization = await orgFactory.createOrganization({
    name: options.organizationName,
    organizationType: options.organizationType || OrganizationType.COLLECTION_AGENCY,
    status: options.organizationStatus || OrganizationStatus.PROVISIONING,
    updatedBy: options.createdBy,
  });

  // Add organization profile if requested
  if (options.withOrgProfile !== false) {
    await orgProfileFactory.addEmail({
      organizationId: organization.id,
      email: `info@${organization.name.toLowerCase().replace(/\s+/g, '')}.com`,
      isPrimary: true,
      emailCategory: EmailCategory.GENERAL,
    });

    await orgProfileFactory.addAddress({
      organizationId: organization.id,
      isPrimary: true,
      addressCategory: AddressCategory.HEADQUARTERS,
    });

    await orgProfileFactory.addPhone({
      organizationId: organization.id,
      isPrimary: true,
      isVerified: true,
      phoneCategory: PhoneCategory.WORK,
    });
  }

  // Step 2: Create admin user
  const userFactory = createUserFactory(userDataSource);
  const roleFactory = createRoleFactory(userDataSource);
  const userProfileFactory = createProfileFactory(userDataSource);

  // Create or get organization admin role
  const role = await roleFactory.createOrgAdminRole(organization.id);

  // Create admin user
  const admin = await userFactory.createOrgAdmin(organization.id, organization.name, role.id, {
    email: options.adminEmail,
    password: options.adminPassword,
    firstName: options.adminFirstName,
    lastName: options.adminLastName,
  });

  // Add user profile if requested
  if (options.withUserProfile !== false) {
    await userProfileFactory.addEmail({
      userId: admin.id,
      email: admin.email,
      isPrimary: true,
    });
  }

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      status: organization.status,
    },
    admin: {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      password: admin.password,
    },
    role: {
      id: role.id,
      name: role.name,
    },
  };
}

/**
 * Onboard multiple organizations with admins in batch
 */
export async function onboardMultipleAdmins(
  orgDataSource: DataSource,
  userDataSource: DataSource,
  count: number,
  options: Omit<OnboardAdminOptions, 'organizationName' | 'adminEmail'> = {},
): Promise<OnboardedAdmin[]> {
  const results: OnboardedAdmin[] = [];

  for (let i = 0; i < count; i++) {
    const result = await onboardAdmin(orgDataSource, userDataSource, {
      ...options,
      organizationName: `Test Organization ${i + 1}`,
      adminEmail: `admin${i + 1}@test.com`,
    });
    results.push(result);
  }

  return results;
}
