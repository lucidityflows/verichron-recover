/**
 * @description Integration tests for the AuthController.
 *
 * ## What This Test Proves:
 * - The AuthController correctly handles HTTP requests for login, token issuance, context switching, and token refreshing.
 * - The controller correctly interacts with the AuthService and sets/clears cookies as expected.
 * - Specific HTTP status codes are returned for successful operations.
 *
 * ## What This Test Does NOT Prove:
 * - The internal business logic of AuthService (that's `auth.service.spec.ts`'s responsibility).
 * - The full authentication guard chain (`JwtAuthGuard`, `AuthContextTokenGuard`) which are mocked out.
 * - Integration with a live database or Redis (AuthService is mocked).
 */
import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthContextTokenGuard } from '../core'
import { JwtAuthGuard } from '@verichron/auth';
import { type Request, type Response } from 'express';
import { TokenIssuanceMethod } from '@verichron/enums';
import { ProfilesService } from '../profiles/profiles.service';
import { RbacService } from '../rbac/rbac.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    getScopedToken: jest.fn(),
    reissueAct: jest.fn(),
    refreshToken: jest.fn(),
  };

  const mockProfilesService = {
    findUserByEmail: jest.fn(),
    getOrganizationAssociations: jest.fn(),
    isUserMemberOfOrg: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRbacService = {
    getPermissionsForUserInOrganization: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
        {
          provide: RbacService,
          useValue: mockRbacService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AuthContextTokenGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .setLogger({ // Suppress [Nest] logs for cleaner test output
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);


    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return organizations and set ACT cookie on successful login', async () => {
      const authLoginDto = { email: 'test@example.com', password: 'password' };
      const mockAct = 'mock-act-token';
      const mockOrganizations = { organizations: [{ id: 'org1', name: 'Org 1' }] };

      mockAuthService.login.mockResolvedValue({
        act: mockAct,
        organizations: mockOrganizations,
      });

      const mockRequest = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as unknown as Request;
      const mockResponse = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const result = await controller.login(authLoginDto, mockRequest, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(
        authLoginDto,
        { ipAddress: '127.0.0.1', userAgent: 'jest' },
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'act',
        mockAct,
        expect.any(Object),
      );
      expect(result).toEqual(mockOrganizations);
    });
  });

  describe('getToken', () => {
    it('should return access and refresh tokens and clear ACT cookie', async () => {
      const authTokenDto = { organizationId: 'org1' };
      const mockTokens = { accessToken: 'access', refreshToken: 'refresh' };
      const mockUserPayload = { sub: 'user1', jti: 'act-jti' };

      mockAuthService.getScopedToken.mockResolvedValue(mockTokens);

      const mockRequest = {
        user: mockUserPayload,
        ip: '127.0.0.0',
        headers: { 'user-agent': 'jest' },
      } as unknown as Request;
      const mockResponse = {
        clearCookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const result = await controller.getToken(mockRequest, authTokenDto, mockResponse);

      expect(authService.getScopedToken).toHaveBeenCalledWith(
        mockUserPayload.sub,
        authTokenDto.organizationId,
        mockUserPayload.jti,
        TokenIssuanceMethod.LOGIN,
        { ipAddress: '127.0.0.0', userAgent: 'jest' },
        undefined,
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('act');
      expect(result).toEqual(mockTokens);
    });

    it('should handle context switch issuance method', async () => {
      const authTokenDto = { organizationId: 'org1', fromOrganizationId: 'org2' };
      const mockTokens = { accessToken: 'access', refreshToken: 'refresh' };
      const mockUserPayload = { sub: 'user1', jti: 'act-jti' };

      mockAuthService.getScopedToken.mockResolvedValue(mockTokens);

      const mockRequest = {
        user: mockUserPayload,
        ip: '127.0.0.0',
        headers: { 'user-agent': 'jest' },
      } as unknown as Request;
      const mockResponse = {
        clearCookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.getToken(mockRequest, authTokenDto, mockResponse);

      expect(authService.getScopedToken).toHaveBeenCalledWith(
        mockUserPayload.sub,
        authTokenDto.organizationId,
        mockUserPayload.jti,
        TokenIssuanceMethod.CONTEXT_SWITCH,
        { ipAddress: '127.0.0.0', userAgent: 'jest' },
        authTokenDto.fromOrganizationId,
      );
    });
  });

  describe('switchContext', () => {
    it('should reissue ACT and return organizations', async () => {
      const mockAct = 'new-mock-act';
      const mockOrganizations = { organizations: [{ id: 'org2', name: 'Org 2' }] };
      const mockUserPayload = { sub: 'user1' };

      mockAuthService.reissueAct.mockResolvedValue({
        act: mockAct,
        organizations: mockOrganizations,
      });

      const mockRequest = { user: mockUserPayload } as unknown as Request;
      const mockResponse = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const result = await controller.switchContext(mockRequest, mockResponse);

      expect(authService.reissueAct).toHaveBeenCalledWith(mockUserPayload.sub);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'act',
        mockAct,
        expect.any(Object),
      );
      expect(result).toEqual(mockOrganizations);
    });
  });

  describe('refreshToken', () => {
    it('should return new access token on successful refresh', async () => {
      const refreshToken = 'old-refresh-token';
      const mockNewAccessToken = { accessToken: 'new-access-token' };

      mockAuthService.refreshToken.mockResolvedValue(mockNewAccessToken);

      const mockRequest = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as unknown as Request;

      const result = await controller.refreshToken(refreshToken, mockRequest);

      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshToken,
        { ipAddress: '127.0.0.1', userAgent: 'jest' },
      );
      expect(result).toEqual(mockNewAccessToken);
    });
  });
});
