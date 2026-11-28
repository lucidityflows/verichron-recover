import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import {
  OrganizationRole,
  OrganizationPermission,
  UserType,
  PlatformRole,
} from '@verichron/enums';
import {
  JWT_CLAIMS_NAMESPACE,
  JWTPayload,
  ActiveContext,
  OrganizationUserContext,
} from '@verichron/contracts';

/**
 * Extended request interface with JWT user payload and active org context
 */
export interface MockRequestWithUser extends Request {
  user?: JWTPayload & {
    username: string;
    email: string;
    orgRoles?: Record<string, string[]>;
    orgPermissions?: Record<string, string[]>;
  };
  activeContext?: ActiveContext;
}

/**
 * Create a mock ExecutionContext for testing guards
 */
export function createMockExecutionContext(
  request: Partial<MockRequestWithUser>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext;
}

/**
 * Create a mock request with user authentication
 */
export function createMockRequest(
  overrides?: Partial<MockRequestWithUser>,
): MockRequestWithUser {
  return {
    headers: {},
    user: {
      sub: 'test-user-id',
      username: 'test.user',
      email: 'test@example.com',
      orgRoles: {},
      orgPermissions: {},
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 3600,
      userType: UserType.ORG_USER,
      [JWT_CLAIMS_NAMESPACE]: {},
    },
    ...overrides,
  } as MockRequestWithUser;
}

/**
 * Create a mock request with organization context
 */
export function createMockOrgRequest(
  orgId: string,
  roles: OrganizationRole[],
  permissions: OrganizationPermission[] = [],
  overrides?: Partial<MockRequestWithUser>,
): MockRequestWithUser {
  const request = createMockRequest(overrides);

  // Set org roles in user JWT payload
  if (request.user) {
    request.user.orgRoles = {
      [orgId]: roles,
    };
    request.user.orgPermissions = {
      [orgId]: permissions,
    };
  }

  // Set active context (populated by OrgContextGuard)!
  const orgContext: OrganizationUserContext = {
    type: 'ORG_USER',
    orgId,
    roles,
    permissions,
  };
  request.activeContext = orgContext;

  // Set x-org-id header
  request.headers = {
    ...request.headers,
    'x-org-id': orgId,
  };

  return request;
}

/**
 * Create a mock request with platform admin context
 */
export function createMockPlatformAdminRequest(
  platformRoles: PlatformRole[] = [PlatformRole.PLATFORM_ADMIN],
  overrides?: Partial<MockRequestWithUser>,
): MockRequestWithUser {
  const request = createMockRequest(overrides);

  if (request.user) {
    // Ensure the JWT_CLAIMS_NAMESPACE object exists
    if (!request.user[JWT_CLAIMS_NAMESPACE]) {
      request.user[JWT_CLAIMS_NAMESPACE] = {};
    }
    // Assign platformRoles under the JWT_CLAIMS_NAMESPACE
    request.user[JWT_CLAIMS_NAMESPACE].platformRoles = platformRoles;
  }
  return request;
}

/**
 * Create a mock TypeORM repository
 */
export function createMockRepository<T>() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    existsBy: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    })),
  };
}

/**
 * Create a mock EventPublisher
 */
export function createMockEventPublisher() {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock Reflector
 */
export function createMockReflector(metadata: Record<string, any> = {}) {
  return {
    get: jest.fn((key: string) => metadata[key]),
    getAll: jest.fn(),
    getAllAndMerge: jest.fn(),
    getAllAndOverride: jest.fn(),
  };
}

/**
 * Wait for all promises to resolve
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
