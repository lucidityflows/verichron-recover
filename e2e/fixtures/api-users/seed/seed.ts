import { UserStatus } from '@verichron/enums';
import { DataSource } from 'typeorm';
import { createUserFactory } from '../factories/userFactory';
import { createRoleFactory } from '../factories/roleFactory';
import { createProfileFactory } from '../factories/profileFactory';
import { createDebtorFactory } from '../factories/debtorFactory';

/**
 * Seed Scenarios for api-users
 * Pre-built test scenarios combining factories
 */

/**
 * Seed a platform admin with full permissions
 */
export async function seedPlatformAdmin(
  dataSource: DataSource,
  options: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  } = {},
) {
  const userFactory = createUserFactory(dataSource);
  const roleFactory = createRoleFactory(dataSource);
  const profileFactory = createProfileFactory(dataSource);

  // Get or create platform admin role
  let role = await roleFactory.findByName('PLATFORM_ADMIN', null);
  if (!role) {
    role = await roleFactory.createPlatformAdminRole();
  }

  // Create platform admin user
  const admin = await userFactory.createPlatformAdmin({
    email: options.email,
    password: options.password,
    firstName: options.firstName,
    lastName: options.lastName,
  });

  // Add primary email
  await profileFactory.addEmail({
    userId: admin.id,
    email: admin.email,
    isPrimary: true,
  });

  return {
    user: admin,
    role,
    roleId: role.id,
    password: admin.password,
  };
}

/**
 * Seed an organization admin with standard permissions
 */
export async function seedOrganizationAdmin(
  dataSource: DataSource,
  organizationId: string,
  organizationName: string,
  options: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    withProfile?: boolean;
  } = {},
) {
  const userFactory = createUserFactory(dataSource);
  const roleFactory = createRoleFactory(dataSource);
  const profileFactory = createProfileFactory(dataSource);

  // Get or create org admin role
  let role = await roleFactory.findByName('ORG_ADMIN', organizationId);
  if (!role) {
    role = await roleFactory.createOrgAdminRole(organizationId);
  }

  // Create org admin user
  const admin = await userFactory.createOrgAdmin(organizationId, organizationName, role.id, {
    email: options.email,
    password: options.password,
    firstName: options.firstName,
    lastName: options.lastName,
  });

  // Add profile details if requested
  if (options.withProfile !== false) {
    await profileFactory.addEmail({
      userId: admin.id,
      email: admin.email,
      isPrimary: true,
    });
  }

  return {
    user: admin,
    role,
    roleId: role.id,
    password: admin.password,
  };
}

/**
 * Seed a regular organization user with limited permissions
 */
export async function seedOrganizationUser(
  dataSource: DataSource,
  organizationId: string,
  organizationName: string,
  options: {
    email?: string;
    password?: string;
    status?: UserStatus;
    withProfile?: boolean;
  } = {},
) {
  const userFactory = createUserFactory(dataSource);
  const roleFactory = createRoleFactory(dataSource);
  const profileFactory = createProfileFactory(dataSource);

  // Get or create org user role
  let role = await roleFactory.findByName('ORG_USER', organizationId);
  if (!role) {
    role = await roleFactory.createOrgUserRole(organizationId);
  }

  // Create org user
  const user = await userFactory.createOrgUser(organizationId, organizationName, role.id, {
    email: options.email,
    password: options.password,
    status: options.status,
  });

  // Add profile details if requested
  if (options.withProfile !== false) {
    await profileFactory.addEmail({
      userId: user.id,
      email: user.email,
      isPrimary: true,
    });
  }

  return {
    user,
    role,
    roleId: role.id,
    password: user.password,
  };
}

/**
 * Seed a pending user (invited but not activated)
 */
export async function seedPendingUser(
  dataSource: DataSource,
  organizationId: string,
  options: {
    email?: string;
    password?: string;
  } = {},
) {
  const userFactory = createUserFactory(dataSource);
  const roleFactory = createRoleFactory(dataSource);
  const profileFactory = createProfileFactory(dataSource);

  // Get or create org user role
  let role = await roleFactory.findByName('ORG_USER', organizationId);
  if (!role) {
    role = await roleFactory.createOrgUserRole(organizationId);
  }

  // Create pending user
  const user = await userFactory.createPendingUser(organizationId, role.id, {
    email: options.email,
    password: options.password,
  });

  // Add email (unverified)
  await profileFactory.addEmail({
    userId: user.id,
    email: user.email,
    isPrimary: true,
  });

  return {
    user,
    role,
    roleId: role.id,
    password: user.password,
    invitationToken: user.invitationToken,
  };
}

/**
 * Seed a complete organization with admin and multiple users
 */
export async function seedOrganizationWithUsers(
  dataSource: DataSource,
  organizationId: string,
  organizationName: string,
  options: {
    adminEmail?: string;
    adminPassword?: string;
    userCount?: number;
  } = {},
) {
  const userCount = options.userCount ?? 3;

  // Create organization admin (handles role creation internally)
  const admin = await seedOrganizationAdmin(dataSource, organizationId, organizationName, {
    email: options.adminEmail,
    password: options.adminPassword,
    withProfile: true,
  });

  // Create regular users (reuses role created by first call)
  const users = [];
  for (let i = 0; i < userCount; i++) {
    const user = await seedOrganizationUser(dataSource, organizationId, organizationName, {
      withProfile: true,
    });
    users.push(user);
  }

  return {
    admin,
    users,
    organizationId,
  };
}

/**
 * Seed a user with complete profile (email, address, phone)
 */
export async function seedUserWithCompleteProfile(
  dataSource: DataSource,
  organizationId: string,
  organizationName: string,
  options: {
    email?: string;
    password?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    phone?: string;
  } = {},
) {
  const userFactory = createUserFactory(dataSource);
  const roleFactory = createRoleFactory(dataSource);
  const profileFactory = createProfileFactory(dataSource);

  // Get or create org user role
  let role = await roleFactory.findByName('ORG_USER', organizationId);
  if (!role) {
    role = await roleFactory.createOrgUserRole(organizationId);
  }

  // Create user
  const user = await userFactory.createOrgUser(organizationId, organizationName, role.id, {
    email: options.email,
    password: options.password,
  });

  // Add email
  await profileFactory.addEmail({
    userId: user.id,
    email: user.email,
    isPrimary: true,
  });

  // Add address
  await profileFactory.addAddress({
    userId: user.id,
    street1: options.address?.street,
    city: options.address?.city,
    state: options.address?.state,
    postalCode: options.address?.zipCode,
    isPrimary: true,
  });

  // Add phone
  await profileFactory.addPhone({
    userId: user.id,
    phoneNumber: options.phone,
    isPrimary: true,
  });

  return {
    user,
    role,
    roleId: role.id,
    password: user.password,
  };
}

/**
 * Seed a debtor user with multi-organization access
 */
export async function seedDebtor(
  dataSource: DataSource,
  organizationIds: string[],
  organizationNames: string[],
  options: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    status?: UserStatus;
    withProfile?: boolean;
  } = {},
) {
  const debtorFactory = createDebtorFactory(dataSource);
  const profileFactory = createProfileFactory(dataSource);

  // Create debtor with multi-org access
  const debtor = await debtorFactory.createDebtor({
    email: options.email,
    password: options.password,
    firstName: options.firstName,
    lastName: options.lastName,
    status: options.status,
    organizationIds,
    organizationNames,
  });

  // Add profile details if requested
  if (options.withProfile !== false) {
    await profileFactory.addEmail({
      userId: debtor.id,
      email: debtor.email,
      isPrimary: true,
    });
  }

  return {
    user: debtor,
    roleId: debtor.roleId,
    password: debtor.password,
    organizationIds: debtor.organizationIds,
    organizationNames: debtor.organizationNames,
    debtorPermissions: debtor.debtorPermissions,
  };
}
