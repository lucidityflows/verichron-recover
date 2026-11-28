import { OrganizationStatus, OrganizationType, AddressCategory, PhoneCategory, EmailCategory } from '@verichron/enums';
import { DataSource } from 'typeorm';
import { createOrganizationFactory } from '../api-organizations/factories/organizationFactory';
import { createOrganizationProfileFactory } from '../api-organizations/factories/profileFactory';
import { createUserFactory } from '../api-users/factories/userFactory';
import { createRoleFactory } from '../api-users/factories/roleFactory';
import { createProfileFactory } from '../api-users/factories/profileFactory';

/**
 * Composed Fixture: Tenant Provisioned
 * Complete tenant provisioning workflow including org, admin, and users
 */

export interface TenantProvisionedOptions {
  // Organization options
  organizationName?: string;
  organizationType?: OrganizationType;
  organizationSettings?: Record<string, any>;

  // Admin options
  adminEmail?: string;
  adminPassword?: string;

  // User options
  userCount?: number;

  // Creator context
  provisionedBy?: string;
}

export interface ProvisionedTenant {
  organization: {
    id: string;
    name: string;
    status: string;
    settings: Record<string, any> | null;
  };
  admin: {
    id: string;
    email: string;
    password: string;
    roleId: string;
  };
  users: Array<{
    id: string;
    email: string;
    password: string;
    roleId: string;
  }>;
}

/**
 * Provision a complete tenant with organization, admin, and users
 * Simulates the full onboarding lifecycle from PROVISIONING to ACTIVE
 */
export async function provisionTenant(
  orgDataSource: DataSource,
  userDataSource: DataSource,
  options: TenantProvisionedOptions = {},
): Promise<ProvisionedTenant> {
  const userCount = options.userCount ?? 3;

  // Step 1: Create organization in PROVISIONING state
  const orgFactory = createOrganizationFactory(orgDataSource);
  const orgProfileFactory = createOrganizationProfileFactory(orgDataSource);

  let organization = await orgFactory.createOrganization({
    name: options.organizationName,
    organizationType: options.organizationType || OrganizationType.COLLECTION_AGENCY,
    status: OrganizationStatus.PROVISIONING,
    settings: options.organizationSettings,
    updatedBy: options.provisionedBy,
  });

  // Add organization contact details
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
    phoneCategory: PhoneCategory.WORK,
  });

  // Step 2: Create roles
  const roleFactory = createRoleFactory(userDataSource);

  const adminRole = await roleFactory.createOrgAdminRole(organization.id);
  const userRole = await roleFactory.createOrgUserRole(organization.id);

  // Step 3: Create admin user
  const userFactory = createUserFactory(userDataSource);
  const userProfileFactory = createProfileFactory(userDataSource);

  const admin = await userFactory.createOrgAdmin(organization.id, organization.name, adminRole.id, {
    email: options.adminEmail,
    password: options.adminPassword,
  });

  await userProfileFactory.addEmail({
    userId: admin.id,
    email: admin.email,
    isPrimary: true,
  });

  // Step 4: Create regular users
  const users = [];
  for (let i = 0; i < userCount; i++) {
    const user = await userFactory.createOrgUser(organization.id, organization.name, userRole.id);

    await userProfileFactory.addEmail({
      userId: user.id,
      email: user.email,
      isPrimary: true,
    });

    users.push({
      id: user.id,
      email: user.email,
      password: user.password,
      roleId: userRole.id,
    });
  }

  // Step 5: Activate organization (complete provisioning)
  organization = await orgFactory.updateStatus(
    organization.id,
    OrganizationStatus.ACTIVE,
    options.provisionedBy,
  );

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      status: organization.status,
      settings: organization.settings,
    },
    admin: {
      id: admin.id,
      email: admin.email,
      password: admin.password,
      roleId: adminRole.id,
    },
    users,
  };
}

/**
 * Provision a tenant and then suspend it
 * Useful for testing suspended organization scenarios
 */
export async function provisionAndSuspendTenant(
  orgDataSource: DataSource,
  userDataSource: DataSource,
  options: TenantProvisionedOptions = {},
): Promise<ProvisionedTenant> {
  const orgFactory = createOrganizationFactory(orgDataSource);

  // First provision the tenant
  const tenant = await provisionTenant(orgDataSource, userDataSource, options);

  // Then suspend the organization
  await orgFactory.updateStatus(
    tenant.organization.id,
    OrganizationStatus.SUSPENDED,
    options.provisionedBy,
  );

  return {
    ...tenant,
    organization: {
      ...tenant.organization,
      status: 'SUSPENDED',
    },
  };
}

/**
 * Provision tenant hierarchy (parent org with child orgs)
 */
export async function provisionTenantHierarchy(
  orgDataSource: DataSource,
  userDataSource: DataSource,
  options: TenantProvisionedOptions & {
    childCount?: number;
  } = {},
): Promise<{
  parent: ProvisionedTenant;
  children: ProvisionedTenant[];
}> {
  const childCount = options.childCount ?? 2;

  // Provision parent tenant
  const parent = await provisionTenant(orgDataSource, userDataSource, options);

  // Provision child tenants
  const orgFactory = createOrganizationFactory(orgDataSource);
  const children: ProvisionedTenant[] = [];

  for (let i = 0; i < childCount; i++) {
    // Create child organization
    const childOrg = await orgFactory.createChildOrganization(parent.organization.id, {
      status: OrganizationStatus.ACTIVE,
    });

    // Provision child with admin and users
    const roleFactory = createRoleFactory(userDataSource);
    const userFactory = createUserFactory(userDataSource);
    const userProfileFactory = createProfileFactory(userDataSource);

    const adminRole = await roleFactory.createOrgAdminRole(childOrg.id);
    const userRole = await roleFactory.createOrgUserRole(childOrg.id);

    const admin = await userFactory.createOrgAdmin(childOrg.id, childOrg.name, adminRole.id);
    await userProfileFactory.addEmail({
      userId: admin.id,
      email: admin.email,
      isPrimary: true,
    });

    children.push({
      organization: {
        id: childOrg.id,
        name: childOrg.name,
        status: childOrg.status,
        settings: childOrg.settings,
      },
      admin: {
        id: admin.id,
        email: admin.email,
        password: admin.password,
        roleId: adminRole.id,
      },
      users: [],
    });
  }

  return {
    parent,
    children,
  };
}
