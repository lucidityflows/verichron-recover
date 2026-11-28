import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { RequestContext, UserContext } from './request-context.service';
import { UserType } from '@verichron/enums';

describe('RequestContext', () => {
  let module: TestingModule;

  beforeEach(async () => {
    // Since it's a request-scoped service, we get a new instance for each test
    module = await createSilentTestingModule({
      providers: [RequestContext],
    }).compile();
  });

  it('should be defined', async () => {
    const service = await module.resolve<RequestContext>(RequestContext);
    expect(service).toBeDefined();
  });

  it('should be unauthenticated initially', async () => {
    const service = await module.resolve<RequestContext>(RequestContext);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getUser()).toBeUndefined();
    expect(service.getUserId()).toBeUndefined();
    expect(service.getOrgId()).toBeUndefined();
    expect(service.getRoles()).toEqual([]);
    expect(service.getPermissions()).toEqual([]);
  });

  it('should store and retrieve the full user context', async () => {
    const service = await module.resolve<RequestContext>(RequestContext);
    const userContext: UserContext = {
      userId: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      userType: UserType.ORG_USER,
      orgId: 'org-456',
      roles: ['user'],
      permissions: ['read'],
    };
    service.setUser(userContext);

    expect(service.getUser()).toEqual(userContext);
    expect(service.isAuthenticated()).toBe(true);
  });

  describe('with an Organization User context', () => {
    let service: RequestContext;
    beforeEach(async () => {
      service = await module.resolve<RequestContext>(RequestContext);
      const orgUserContext: UserContext = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        userType: UserType.ORG_USER,
        orgId: 'org-456',
        roles: ['collector', 'team_lead'],
        permissions: ['debt:read', 'debt:update:notes'],
      };
      service.setUser(orgUserContext);
    });

    it('should return the user ID', () => {
      expect(service.getUserId()).toBe('user-123');
    });

    it('should return the organization ID', () => {
      expect(service.getOrgId()).toBe('org-456');
    });

    it('should return the user email', () => {
        expect(service.getUserEmail()).toBe('test@example.com');
    });

    it('should return the username', () => {
        expect(service.getUsername()).toBe('testuser');
    });

    it('should return the roles', () => {
      expect(service.getRoles()).toEqual(['collector', 'team_lead']);
    });

    it('should return the permissions', () => {
      expect(service.getPermissions()).toEqual(['debt:read', 'debt:update:notes']);
    });

    it('should return true for hasRole if the role exists', () => {
      expect(service.hasRole('collector')).toBe(true);
    });

    it('should return false for hasRole if the role does not exist', () => {
      expect(service.hasRole('admin')).toBe(false);
    });

    it('should return true for hasPermission if the permission exists', () => {
      expect(service.hasPermission('debt:read')).toBe(true);
    });

    it('should return false for hasPermission if the permission does not exist', () => {
      expect(service.hasPermission('debt:delete')).toBe(false);
    });
  });

  describe('with a Platform Admin context', () => {
    let service: RequestContext;
    beforeEach(async () => {
      service = await module.resolve<RequestContext>(RequestContext);
      const adminContext: UserContext = {
        userId: 'admin-001',
        username: 'platform_admin',
        email: 'admin@verichron.com',
        userType: UserType.PLATFORM_USER,
        platformRoles: ['PLATFORM_ADMIN'],
        // orgId, roles, and permissions would be undefined for a pure platform admin
      };
      service.setUser(adminContext);
    });

    it('should return platform roles', () => {
      expect(service.getPlatformRoles()).toEqual(['PLATFORM_ADMIN']);
    });

    it('should return true for hasPlatformRole if the role exists', () => {
      expect(service.hasPlatformRole('PLATFORM_ADMIN')).toBe(true);
    });

    it('should return undefined for orgId', () => {
      expect(service.getOrgId()).toBeUndefined();
    });

    it('should return an empty array for org-specific roles and permissions', () => {
      expect(service.getRoles()).toEqual([]);
      expect(service.getPermissions()).toEqual([]);
    });
  });
  
  it('should return empty arrays for roles/permissions if they are not defined on the context', async () => {
    const service = await module.resolve<RequestContext>(RequestContext);
    const userContext: UserContext = {
      userId: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      userType: UserType.ORG_USER,
      // No roles or permissions
    };
    service.setUser(userContext);

    expect(service.getRoles()).toEqual([]);
    expect(service.getPermissions()).toEqual([]);
    expect(service.getPlatformRoles()).toEqual([]);
  });
});
