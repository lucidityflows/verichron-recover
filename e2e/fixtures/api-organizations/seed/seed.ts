import { AddressCategory, PhoneCategory, EmailCategory, OrganizationStatus, OrganizationType } from '@verichron/enums';
import { DataSource } from 'typeorm';
import { createOrganizationFactory } from '../factories/organizationFactory';
import { createOrganizationProfileFactory } from '../factories/profileFactory';

/**
 * Seed Scenarios for api-organizations
 * Pre-built test scenarios combining factories
 */

/**
 * Seed a basic collection agency
 */
export async function seedCollectionAgency(
  dataSource: DataSource,
  options: {
    name?: string;
    status?: OrganizationStatus;
    withProfile?: boolean;
  } = {},
) {
  const orgFactory = createOrganizationFactory(dataSource);
  const profileFactory = createOrganizationProfileFactory(dataSource);

  // Create collection agency
  const organization = await orgFactory.createCollectionAgency({
    name: options.name,
    status: options.status,
  });

  // Add profile details if requested
  if (options.withProfile !== false) {
    await profileFactory.addEmail({
      organizationId: organization.id,
      email: `contact@${organization.name.toLowerCase().replace(/\s+/g, '')}.com`,
      isPrimary: true,
      isVerified: true,
      emailCategory: EmailCategory.GENERAL,
    });

    await profileFactory.addAddress({
      organizationId: organization.id,
      isPrimary: true,
      addressCategory: AddressCategory.HEADQUARTERS,
    });

    await profileFactory.addPhone({
      organizationId: organization.id,
      isPrimary: true,
      isVerified: true,
      phoneCategory: PhoneCategory.WORK,
    });
  }

  return {
    organization,
  };
}

/**
 * Seed a creditor organization
 */
export async function seedCreditor(
  dataSource: DataSource,
  options: {
    name?: string;
    status?: OrganizationStatus;
    withProfile?: boolean;
  } = {},
) {
  const orgFactory = createOrganizationFactory(dataSource);
  const profileFactory = createOrganizationProfileFactory(dataSource);

  // Create creditor
  const organization = await orgFactory.createCreditor({
    name: options.name,
    status: options.status,
  });

  // Add profile details if requested
  if (options.withProfile !== false) {
    await profileFactory.addEmail({
      organizationId: organization.id,
      email: `billing@${organization.name.toLowerCase().replace(/\s+/g, '')}.com`,
      isPrimary: true,
      isVerified: true,
      emailCategory: EmailCategory.BILLING,
    });

    await profileFactory.addAddress({
      organizationId: organization.id,
      isPrimary: true,
      addressCategory: AddressCategory.HEADQUARTERS,
    });

    await profileFactory.addPhone({
      organizationId: organization.id,
      isPrimary: true,
      isVerified: true,
      phoneCategory: PhoneCategory.WORK,
    });
  }

  return {
    organization,
  };
}

/**
 * Seed organization with complete profile (multiple contacts)
 */
export async function seedOrganizationWithCompleteProfile(
  dataSource: DataSource,
  options: {
    name?: string;
    organizationType?: OrganizationType;
    status?: OrganizationStatus;
  } = {},
) {
  const orgFactory = createOrganizationFactory(dataSource);
  const profileFactory = createOrganizationProfileFactory(dataSource);

  // Create organization
  const organization = await orgFactory.createOrganization({
    name: options.name,
    organizationType: options.organizationType || OrganizationType.COLLECTION_AGENCY,
    status: options.status || OrganizationStatus.ACTIVE,
  });

  // Add multiple emails
  await profileFactory.addEmail({
    organizationId: organization.id,
    email: `info@${organization.name.toLowerCase().replace(/\s+/g, '')}.com`,
    isPrimary: true,
    isVerified: true,
    emailCategory: EmailCategory.GENERAL,
  });

  await profileFactory.addEmail({
    organizationId: organization.id,
    email: `billing@${organization.name.toLowerCase().replace(/\s+/g, '')}.com`,
    isPrimary: false,
    isVerified: true,
    emailCategory: EmailCategory.BILLING,
  });

  await profileFactory.addEmail({
    organizationId: organization.id,
    email: `support@${organization.name.toLowerCase().replace(/\s+/g, '')}.com`,
    isPrimary: false,
    isVerified: true,
    emailCategory: EmailCategory.SUPPORT,
  });

  // Add multiple addresses
  await profileFactory.addAddress({
    organizationId: organization.id,
    isPrimary: true,
    addressCategory: AddressCategory.HEADQUARTERS,
  });

  await profileFactory.addAddress({
    organizationId: organization.id,
    isPrimary: false,
    addressCategory: AddressCategory.LEGAL_CORRESPONDENCE,
  });

  // Add multiple phones
  await profileFactory.addPhone({
    organizationId: organization.id,
    isPrimary: true,
    isVerified: true,
    phoneCategory: PhoneCategory.WORK,
  });

  await profileFactory.addPhone({
    organizationId: organization.id,
    extension: '100',
    isPrimary: false,
    isVerified: true,
    phoneCategory: PhoneCategory.WORK,
  });

  return {
    organization,
  };
}

/**
 * Seed organization hierarchy (parent with children)
 */
export async function seedOrganizationHierarchy(
  dataSource: DataSource,
  options: {
    parentName?: string;
    childCount?: number;
  } = {},
) {
  const orgFactory = createOrganizationFactory(dataSource);
  const childCount = options.childCount ?? 2;

  // Create parent organization
  const parent = await orgFactory.createCollectionAgency({
    name: options.parentName,
    status: OrganizationStatus.ACTIVE,
  });

  // Create child organizations
  const children = [];
  for (let i = 0; i < childCount; i++) {
    const child = await orgFactory.createChildOrganization(parent.id, {
      status: OrganizationStatus.ACTIVE,
    });
    children.push(child);
  }

  return {
    parent,
    children,
  };
}

/**
 * Seed provisioning organization (new tenant setup)
 */
export async function seedProvisioningOrganization(
  dataSource: DataSource,
  options: {
    name?: string;
    organizationType?: OrganizationType;
  } = {},
) {
  const orgFactory = createOrganizationFactory(dataSource);

  // Create organization in provisioning state
  const organization = await orgFactory.createOrganization({
    name: options.name,
    organizationType: options.organizationType || OrganizationType.COLLECTION_AGENCY,
    status: OrganizationStatus.PROVISIONING,
  });

  return {
    organization,
  };
}

/**
 * Seed organization with custom settings
 */
export async function seedOrganizationWithSettings(
  dataSource: DataSource,
  settings: Record<string, any>,
  options: {
    name?: string;
    organizationType?: OrganizationType;
  } = {},
) {
  const orgFactory = createOrganizationFactory(dataSource);

  // Create organization with settings
  const organization = await orgFactory.createOrganization({
    name: options.name,
    organizationType: options.organizationType || OrganizationType.COLLECTION_AGENCY,
    status: OrganizationStatus.ACTIVE,
    settings,
  });

  return {
    organization,
    settings,
  };
}
