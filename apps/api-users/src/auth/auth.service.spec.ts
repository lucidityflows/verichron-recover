/**
 * @system-rule R-U-AUTH-001, R-U-AUTH-002, R-U-AUTH-003, R-U-AUTH-004, R-U-AUTH-005, R-U-AUTH-006
 * @description Unit tests for the AuthService.
 *
 * ## What This Test Proves:
 * - The two-step login flow (`login` and `getScopedToken`) works as expected.
 * - `getScopedToken` correctly throws an exception for users outside their organization.
 * - `getScopedToken` correctly builds JWTs for both organization users and platform admins.
 * - The ACT (Authentication Context Token) JTI is correctly "burned" in Redis to prevent reuse.
 * - Refresh token logic is sound (to be expanded).
 */
import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { ModuleRef } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ProfilesService } from '../profiles/profiles.service';
import { RbacService } from '../rbac/rbac.service';
import { RedisService } from '../redis/redis.service';
import { EventPublisher } from '@verichron/event-publisher';
import * as bcrypt from 'bcrypt';
import { type UserEntity } from '../profiles/entities';
import { UserStatus, UserType, PlatformRole } from '@verichron/enums';
import { JWT_CLAIMS_NAMESPACE } from '@verichron/contracts';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock data
const mockUser: UserEntity = {
  id: 'user-uuid-123',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  firstName: 'Test',
  middleName: 'Testerson',
  lastName: 'User',
  suffix: '',
  status: UserStatus.ACTIVE,
  memberships: [],
  emails: [],
  invitationToken: null,
  invitationExpiresAt: null,
  passwordResetToken: null,
  passwordResetExpiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  addresses: [],
  phoneNumbers: []
};

// Mock providers
const createMockProvider = (provide: any, methods: string[]) => ({
  provide,
  useValue: methods.reduce((obj, method) => ({ ...obj, [method]: jest.fn() }), {}),
});

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let profilesService: ProfilesService;
  let rbacService: RbacService;
  let redisService: RedisService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockProfilesService = {
      findUserByEmail: jest.fn(),
      getOrganizationAssociations: jest.fn(),
      isUserMemberOfOrg: jest.fn(),
      findOne: jest.fn(),
    };

    const mockRbacService = {
      getPermissionsForUserInOrganization: jest.fn(),
    };

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        AuthService,
        createMockProvider(ConfigService, ['get']),
        createMockProvider(JwtService, ['signAsync', 'verifyAsync']),
        { provide: ProfilesService, useValue: mockProfilesService },
        { provide: RbacService, useValue: mockRbacService },
        createMockProvider(RedisService, ['set']),
        createMockProvider(EventPublisher, ['publish']),
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn((type) => {
              if (type === ProfilesService) return mockProfilesService;
              if (type === RbacService) return mockRbacService;
              return null;
            }),
          },
        },
      ],
    })
      .setLogger({ // Suppress [Nest] logs for cleaner test output
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      })
      .compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    profilesService = module.get<ProfilesService>(ProfilesService);
    rbacService = module.get<RbacService>(RbacService);
    redisService = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock ConfigService to return default values for JWT
    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      switch (key) {
        case 'JWT_SECRET': return 'test-jwt-secret';
        case 'JWT_ACCESS_TOKEN_EXPIRES_IN': return '1h';
        case 'JWT_REFRESH_SECRET': return 'test-jwt-refresh-secret';
        case 'JWT_REFRESH_TOKEN_EXPIRES_IN': return '7d';
        case 'AUTH_CONTEXT_TOKEN_SECRET': return 'test-auth-context-secret';
        default: return undefined;
      }
    });

    // Trigger onModuleInit to set up lazy dependencies
    await service.onModuleInit();

    // Mock config service get method
    // jest.spyOn(service, 'validateUser' as any).mockResolvedValue(mockUser);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return an ACT and organization list on successful login', async () => {
      const mockOrgs = [{ organizationId: 'org-uuid-456', organizationName: 'Test Org', role: 'Admin' }];
      const mockAct = 'mock-act-token';

      jest.spyOn(profilesService, 'findUserByEmail').mockResolvedValue(mockUser);
      jest.spyOn(profilesService, 'getOrganizationAssociations').mockResolvedValue(mockOrgs as any);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockAct);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'test@example.com', password: 'password' });

      expect(profilesService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(profilesService.getOrganizationAssociations).toHaveBeenCalledWith(mockUser.id);
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(result.act).toEqual(mockAct);
      expect(result.organizations.organizations).toEqual(mockOrgs);
    });
  });

  describe('getScopedToken', () => {
    it('should return access and refresh tokens for a valid organization', async () => {
      const orgId = 'org-uuid-456';
      const actJti = 'act-jti-789';
      const mockPermissions = { permissions: ['user:read'], role: 'Admin' };
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      jest.spyOn(profilesService, 'isUserMemberOfOrg').mockResolvedValue(true);
      jest.spyOn(rbacService, 'getPermissionsForUserInOrganization').mockResolvedValue(mockPermissions);
      jest.spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);
      jest.spyOn(redisService, 'set').mockResolvedValue('OK');
      jest.spyOn(profilesService, 'findOne').mockResolvedValue(mockUser);

      const result = await service.getScopedToken(mockUser.id, orgId, actJti);

      expect(profilesService.isUserMemberOfOrg).toHaveBeenCalledWith(mockUser.id, orgId);
      expect(rbacService.getPermissionsForUserInOrganization).toHaveBeenCalledWith(mockUser.id, orgId);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(redisService.set).toHaveBeenCalledWith(`jti:${actJti}`, 'burned', 'EX', 300);
      expect(result.accessToken).toEqual(mockAccessToken);
      expect(result.refreshToken).toEqual(mockRefreshToken);
    });

    it('should throw an UnauthorizedException if user is not a member of the org', async () => {
      jest.spyOn(profilesService, 'isUserMemberOfOrg').mockResolvedValue(false);

      await expect(service.getScopedToken(mockUser.id, 'invalid-org', 'jti')).rejects.toThrow(
        'User is not a member of the specified organization.',
      );
    });

    it('should return a platform-scoped token when organizationId is null', async () => {
      const orgId = null;
      const actJti = 'act-jti-platform';
      const mockPermissions = {
        permissions: ['platform:orgs:create'],
        role: PlatformRole.PLATFORM_ADMIN,
      };
      const mockAccessToken = 'mock-platform-access-token';
      const mockRefreshToken = 'mock-platform-refresh-token';

      jest.spyOn(profilesService, 'isUserMemberOfOrg').mockResolvedValue(true);
      jest.spyOn(profilesService, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(rbacService, 'getPermissionsForUserInOrganization')
        .mockResolvedValue(mockPermissions);
      jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);
      jest.spyOn(redisService, 'set').mockResolvedValue('OK');

      const result = await service.getScopedToken(mockUser.id, orgId, actJti);

      // For platform admins, the membership check is correctly bypassed.
      expect(profilesService.isUserMemberOfOrg).not.toHaveBeenCalled();
      expect(
        rbacService.getPermissionsForUserInOrganization,
      ).toHaveBeenCalledWith(mockUser.id, null);

      // Verify the access token payload
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          userType: UserType.PLATFORM_USER,
          [JWT_CLAIMS_NAMESPACE]: {
            organizationId: null,
            platformRoles: [PlatformRole.PLATFORM_ADMIN],
            platformPermissions: mockPermissions.permissions,
          },
        }),
        expect.any(Object),
      );

      expect(result.accessToken).toEqual(mockAccessToken);
      expect(result.refreshToken).toEqual(mockRefreshToken);
    });
    it('should throw UnauthorizedException for an invalid refresh token', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid or expired refresh token.',
      );
    });
  });
});
