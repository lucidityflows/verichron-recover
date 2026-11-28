import { OrganizationType, OrganizationStatus,  UserType, PlatformRole } from '@verichron/enums';
import { JWT_CLAIMS_NAMESPACE } from '@verichron/contracts';

/**
 * Mock Organization entity (plain object to avoid circular dependencies)
 */
export interface MockOrganization {
  id: string;
  name: string;
  displayName: string | null;
  organizationType: OrganizationType;
  status: OrganizationStatus;
  taxId: string | null;
  settings: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  parentOrganizationId: string | null;
  addresses?: any[];
  emails?: any[];
  phoneNumbers?: any[];
}

/**
 * Create a mock Organization entity
 */
export function createMockOrganization(
  overrides?: Partial<MockOrganization>,
): MockOrganization {
  return {
    id: 'org-123',
    name: 'Test Organization',
    displayName: 'Test Organization',
    organizationType: OrganizationType.COLLECTION_AGENCY,
    status: OrganizationStatus.ACTIVE,
    taxId: '12-3456789',
    settings: {
      timezone: 'America/New_York',
      locale: 'en-US',
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    parentOrganizationId: null,
    addresses: [],
    emails: [],
    phoneNumbers: [],
    ...overrides,
  };
}

/**
 * Create multiple mock organizations
 */
export function createMockOrganizations(count: number): MockOrganization[] {
  return Array.from({ length: count }, (_, i) =>
    createMockOrganization({
      id: `org-${i + 1}`,
      name: `Organization ${i + 1}`,
      displayName: `Org ${i + 1}`,
    }),
  );
}

/**
 * Mock ProvisionOrganizationDto
 */
export const mockProvisionOrganizationDto = {
  organization: {
    name: 'New Organization',
    displayName: 'New Org',
    organizationType: OrganizationType.COLLECTION_AGENCY,
    taxId: '12-3456789',
  },
  initialAdmin: {
    email: 'admin@example.com',
    firstName: 'John',
    lastName: 'Doe',
  },
  createdBy: 'platform-admin-123',
};

/**
 * Mock UpdateOrganizationDto
 */
export const mockUpdateOrganizationDto = {
  displayName: 'Updated Org Name',
  taxId: '98-7654321',
};

/**
 * Mock OrganizationSettings
 */
export const mockOrganizationSettings = {
  timezone: 'America/New_York',
  locale: 'en-US',
  features: {
    analytics: true,
    reporting: true,
  },
  notifications: {
    email: true,
    sms: false,
  },
};

/**
 * Mock JWT user payload
 */
export const mockJwtUser = {
  sub: 'user-123',
  username: 'test.user',
  email: 'test@example.com',
  iat: Date.now() / 1000,
  exp: Date.now() / 1000 + 3600,
  userType: UserType.ORG_USER,
  orgRoles: {
    'org-123': ['ORG_ADMIN'],
    'org-456': ['ORG_MANAGER'],
  },
  orgPermissions: {
    'org-123': [
      'orgs:read',
      'orgs:write',
      'users:read',
      'users:write',
      'users:delete',
    ],
    'org-456': ['orgs:read', 'users:read'],
  },
  [JWT_CLAIMS_NAMESPACE]: {
    platformRoles: [],
  },
};

/**
 * Mock platform admin JWT payload
 */
export const mockPlatformAdminUser = {
  sub: 'admin-123',
  username: 'platform.admin',
  email: 'admin@platform.com',
  iat: Date.now() / 1000,
  exp: Date.now() / 1000 + 3600,
  userType: UserType.PLATFORM_USER,
  orgRoles: {},
  orgPermissions: {},
  [JWT_CLAIMS_NAMESPACE]: {
    platformRoles: [PlatformRole.PLATFORM_ADMIN],
  },
};

/**
 * Mock platform support JWT payload
 */
export const mockPlatformSupportUser = {
  sub: 'support-123',
  username: 'platform.support',
  email: 'support@platform.com',
  iat: Date.now() / 1000,
  exp: Date.now() / 1000 + 3600,
  userType: UserType.PLATFORM_USER,
  orgRoles: {},
  orgPermissions: {},
  [JWT_CLAIMS_NAMESPACE]: {
    platformRoles: [PlatformRole.PLATFORM_SUPPORT],
  },
};
