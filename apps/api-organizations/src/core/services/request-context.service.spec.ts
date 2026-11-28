import { RequestContext, UserContext } from './request-context.service';
import { OrganizationRole, PlatformRole } from '@verichron/enums';

describe('RequestContext', () => {
  let service: RequestContext;

  beforeEach(() => {
    service = new RequestContext();
  });

  describe('setUser and getUser', () => {
    it('should set and get user context', () => {
      const userContext: UserContext = {
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
        orgId: 'org-123',
        roles: [OrganizationRole.ORG_ADMIN],
        permissions: ['orgs:read', 'orgs:write'],
        platformRoles: [],
      };

      service.setUser(userContext);

      expect(service.getUser()).toEqual(userContext);
    });

    it('should return undefined when user is not set', () => {
      expect(service.getUser()).toBeUndefined();
    });

    it('should overwrite previous user context', () => {
      const userContext1: UserContext = {
        userId: 'user-1',
        username: 'user.one',
        email: 'one@example.com',
      };

      const userContext2: UserContext = {
        userId: 'user-2',
        username: 'user.two',
        email: 'two@example.com',
      };

      service.setUser(userContext1);
      expect(service.getUser()).toEqual(userContext1);

      service.setUser(userContext2);
      expect(service.getUser()).toEqual(userContext2);
    });
  });

  describe('getUserId', () => {
    it('should return user ID when user is set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
      });

      expect(service.getUserId()).toBe('user-123');
    });

    it('should return undefined when user is not set', () => {
      expect(service.getUserId()).toBeUndefined();
    });
  });

  describe('getUserEmail', () => {
    it('should return user email when user is set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
      });

      expect(service.getUserEmail()).toBe('test@example.com');
    });

    it('should return undefined when user is not set', () => {
      expect(service.getUserEmail()).toBeUndefined();
    });
  });

  describe('getUsername', () => {
    it('should return username when user is set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
      });

      expect(service.getUsername()).toBe('test.user');
    });

    it('should return undefined when user is not set', () => {
      expect(service.getUsername()).toBeUndefined();
    });
  });

  describe('getOrgId', () => {
    it('should return org ID when org context is set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
        orgId: 'org-123',
      });

      expect(service.getOrgId()).toBe('org-123');
    });

    it('should return undefined when org context is not set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
      });

      expect(service.getOrgId()).toBeUndefined();
    });

    it('should return undefined when user is not set', () => {
      expect(service.getOrgId()).toBeUndefined();
    });
  });

  describe('getRoles', () => {
    it('should return roles when set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
        roles: [OrganizationRole.ORG_ADMIN, OrganizationRole.ORG_MANAGER],
      });

      expect(service.getRoles()).toEqual([
        OrganizationRole.ORG_ADMIN,
        OrganizationRole.ORG_MANAGER,
      ]);
    });

    it('should return empty array when roles are not set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
      });

      expect(service.getRoles()).toEqual([]);
    });

    it('should return empty array when user is not set', () => {
      expect(service.getRoles()).toEqual([]);
    });
  });

  describe('getPermissions', () => {
    it('should return permissions when set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
        permissions: ['orgs:read', 'orgs:write', 'users:read'],
      });

      expect(service.getPermissions()).toEqual([
        'orgs:read',
        'orgs:write',
        'users:read',
      ]);
    });

    it('should return empty array when permissions are not set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
      });

      expect(service.getPermissions()).toEqual([]);
    });

    it('should return empty array when user is not set', () => {
      expect(service.getPermissions()).toEqual([]);
    });
  });

  describe('getPlatformRoles', () => {
    it('should return platform roles when set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
        platformRoles: [PlatformRole.PLATFORM_ADMIN],
      });

      expect(service.getPlatformRoles()).toEqual([PlatformRole.PLATFORM_ADMIN]);
    });

    it('should return empty array when platform roles are not set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
      });

      expect(service.getPlatformRoles()).toEqual([]);
    });

    it('should return empty array when user is not set', () => {
      expect(service.getPlatformRoles()).toEqual([]);
    });
  });

  describe('hasRole', () => {
    beforeEach(() => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
        roles: [OrganizationRole.ORG_ADMIN, OrganizationRole.ORG_MANAGER],
      });
    });

    it('should return true when user has the role', () => {
      expect(service.hasRole(OrganizationRole.ORG_ADMIN)).toBe(true);
      expect(service.hasRole(OrganizationRole.ORG_MANAGER)).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      expect(service.hasRole(OrganizationRole.ORG_VIEWER)).toBe(false);
      expect(service.hasRole(OrganizationRole.ORG_COLLECTOR)).toBe(false);
    });

    it('should return false when user has no roles', () => {
      const newService = new RequestContext();
      newService.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
      });

      expect(newService.hasRole(OrganizationRole.ORG_ADMIN)).toBe(false);
    });

    it('should return false when user is not set', () => {
      const newService = new RequestContext();
      expect(newService.hasRole(OrganizationRole.ORG_ADMIN)).toBe(false);
    });
  });

  describe('hasPermission', () => {
    beforeEach(() => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
        permissions: ['orgs:read', 'orgs:write', 'users:read'],
      });
    });

    it('should return true when user has the permission', () => {
      expect(service.hasPermission('orgs:read')).toBe(true);
      expect(service.hasPermission('orgs:write')).toBe(true);
      expect(service.hasPermission('users:read')).toBe(true);
    });

    it('should return false when user does not have the permission', () => {
      expect(service.hasPermission('users:write')).toBe(false);
      expect(service.hasPermission('users:delete')).toBe(false);
    });

    it('should return false when user has no permissions', () => {
      const newService = new RequestContext();
      newService.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
      });

      expect(newService.hasPermission('orgs:read')).toBe(false);
    });

    it('should return false when user is not set', () => {
      const newService = new RequestContext();
      expect(newService.hasPermission('orgs:read')).toBe(false);
    });
  });

  describe('hasPlatformRole', () => {
    beforeEach(() => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
        platformRoles: [PlatformRole.PLATFORM_ADMIN],
      });
    });

    it('should return true when user has the platform role', () => {
      expect(service.hasPlatformRole(PlatformRole.PLATFORM_ADMIN)).toBe(true);
    });

    it('should return false when user does not have the platform role', () => {
      expect(service.hasPlatformRole(PlatformRole.PLATFORM_SUPPORT)).toBe(false);
    });

    it('should return false when user has no platform roles', () => {
      const newService = new RequestContext();
      newService.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
      });

      expect(newService.hasPlatformRole(PlatformRole.PLATFORM_ADMIN)).toBe(false);
    });

    it('should return false when user is not set', () => {
      const newService = new RequestContext();
      expect(newService.hasPlatformRole(PlatformRole.PLATFORM_ADMIN)).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is set', () => {
      service.setUser({
        userId: 'user-123',
        username: 'test.user',
        email: 'test@example.com',
      });

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when user is not set', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('comprehensive scenarios', () => {
    it('should handle platform admin with no org context', () => {
      service.setUser({
        userId: 'admin-123',
        username: 'platform.admin',
        email: 'admin@platform.com',
        platformRoles: [PlatformRole.PLATFORM_ADMIN],
      });

      expect(service.isAuthenticated()).toBe(true);
      expect(service.getUserId()).toBe('admin-123');
      expect(service.getOrgId()).toBeUndefined();
      expect(service.getRoles()).toEqual([]);
      expect(service.getPermissions()).toEqual([]);
      expect(service.hasPlatformRole(PlatformRole.PLATFORM_ADMIN)).toBe(true);
    });

    it('should handle org admin with full context', () => {
      service.setUser({
        userId: 'user-123',
        username: 'org.admin',
        email: 'admin@org.com',
        orgId: 'org-123',
        roles: [OrganizationRole.ORG_ADMIN],
        permissions: ['orgs:read', 'orgs:write', 'users:read', 'users:write'],
        platformRoles: [],
      });

      expect(service.isAuthenticated()).toBe(true);
      expect(service.getUserId()).toBe('user-123');
      expect(service.getOrgId()).toBe('org-123');
      expect(service.hasRole(OrganizationRole.ORG_ADMIN)).toBe(true);
      expect(service.hasPermission('orgs:write')).toBe(true);
      expect(service.hasPlatformRole(PlatformRole.PLATFORM_ADMIN)).toBe(false);
    });

    it('should handle org viewer with minimal permissions', () => {
      service.setUser({
        userId: 'user-123',
        username: 'org.viewer',
        email: 'viewer@org.com',
        orgId: 'org-123',
        roles: [OrganizationRole.ORG_VIEWER],
        permissions: ['orgs:read'],
      });

      expect(service.hasRole(OrganizationRole.ORG_VIEWER)).toBe(true);
      expect(service.hasRole(OrganizationRole.ORG_ADMIN)).toBe(false);
      expect(service.hasPermission('orgs:read')).toBe(true);
      expect(service.hasPermission('orgs:write')).toBe(false);
    });
  });
});
