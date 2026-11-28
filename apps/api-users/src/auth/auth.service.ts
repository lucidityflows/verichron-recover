import { Injectable, UnauthorizedException, OnModuleInit, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { 
  LoginMethod, 
  TokenIssuanceMethod ,
  LoginFailReason,
  TokenType,
  OrganizationRole
} from '@verichron/enums';
import { EVENT_TYPES } from '@verichron/events';

// Ensure JWT environment variables are set
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set.');
}
if (!process.env.JWT_ACCESS_TOKEN_EXPIRES_IN) {
  throw new Error('JWT_ACCESS_TOKEN_EXPIRES_IN environment variable is not set.');
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is not set.');
}
if (!process.env.JWT_REFRESH_TOKEN_EXPIRES_IN) {
  throw new Error('JWT_REFRESH_TOKEN_EXPIRES_IN environment variable is not set.');
}
if (!process.env.AUTH_CONTEXT_TOKEN_SECRET) {
  throw new Error('AUTH_CONTEXT_TOKEN_SECRET environment variable is not set.');
}

type JwtOptions = Omit<JwtSignOptions, 'expiresIn'> & {
  expiresIn?: string | number;
};
import * as bcrypt from 'bcrypt';
import { RedisService } from '../redis/redis.service';
import { ProfilesService } from '../profiles/profiles.service';
import { RbacService } from '../rbac/rbac.service';
import { AuthLoginDto, AuthOrganizationListResponseDto, AuthTokenResponseDto } from './dto';
import { UserEntity } from '../profiles/entities/user.entity';
import { InvalidCredentialsException, InvalidResetTokenException } from './errors';
import { EventPublisher } from '@verichron/event-publisher';
import {
  JWT_CLAIMS_NAMESPACE,
  CustomJWTClaims,
} from '@verichron/contracts';
import { LoginSuccessDto } from '../events/event-dto/auth/login-success.dto';
import { LoginFailedDto } from '../events/event-dto/auth/login-failed.dto';
import { ContextSwitchedDto } from '../events/event-dto/auth/context-switched.dto';
import { TokenIssuedDto } from '../events/event-dto/auth/token-issued.dto';
import { PasswordResetRequestedDto } from '../events/event-dto/auth/password-reset-requested.dto';
import {
  PlatformRole,
  PlatformPermission,
} from '@verichron/enums';
import { UserType, OrganizationPermission } from '@verichron/enums';

/**
 * Request metadata for event publishing
 */
export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly moduleRef: ModuleRef,
    private readonly eventPublisher: EventPublisher, // Only inject publisher
  ) {}

  private profilesService: ProfilesService;
  private rbacService: RbacService;

  onModuleInit() {
    this.profilesService = this.moduleRef.get(ProfilesService, { strict: false });
    this.rbacService = this.moduleRef.get(RbacService, { strict: false });
  }

  /**
   * Validates a user's credentials.
   * @param email The user's email.
   * @param pass The user's password.
   * @returns The user object if credentials are valid.
   * @throws UnauthorizedException if credentials are invalid.
   */
  private async validateUser(email: string, pass: string): Promise<UserEntity> {
    // In a real implementation, this would be a single call to ProfilesService.
    const user = await this.profilesService.findUserByEmail(email); // This method needs to be created in ProfilesService

    if (!user) {
      throw new InvalidCredentialsException();
    }

    // Check if user has activated their account (passwordHash is set)
    if (!user.passwordHash) {
      throw new UnauthorizedException('Account not activated. Please check your email for the activation link.');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result as UserEntity;
  }

  /**
   * Step 1 of Login: Validate credentials and return organization list + ACT.
   * @param authLoginDto User credentials.
   * @param metadata Optional request metadata (IP address, user agent) for event publishing.
   * @returns A list of organizations and the Authentication Context Token (ACT).
   */
  async login(
    authLoginDto: AuthLoginDto,
    metadata?: RequestMetadata,
  ): Promise<{ act: string; organizations: AuthOrganizationListResponseDto }> {
    try {
      const user = await this.validateUser(authLoginDto.email, authLoginDto.password);

      // Publish LoginSuccess event
      const loginSuccessDto = new LoginSuccessDto();
      loginSuccessDto.userId = user.id;
      loginSuccessDto.email = user.email;
      loginSuccessDto.loginMethod = LoginMethod.PASSWORD;
      loginSuccessDto.ipAddress = metadata?.ipAddress;
      loginSuccessDto.userAgent = metadata?.userAgent;

      await this.eventPublisher.publish(
        EVENT_TYPES.USERS_AUTH_LOGIN_SUCCESS,
        {
          userId: user.id,
          email: user.email,
          loginMethod: LoginMethod.PASSWORD,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
        },
        LoginSuccessDto,
      );

      this.logger.log(`User ${user.email} logged in successfully`);

      return this.reissueAct(user.id);
    } catch (error) {
      // Publish LoginFailed event
      const loginFailedDto = new LoginFailedDto();
      loginFailedDto.email = authLoginDto.email;
      loginFailedDto.reason = LoginFailReason.INVALID_CREDENTIALS;
      loginFailedDto.ipAddress = metadata?.ipAddress;
      loginFailedDto.userAgent = metadata?.userAgent;

      await this.eventPublisher.publish(
        EVENT_TYPES.USERS_AUTH_LOGIN_FAILED,
        {
          email: authLoginDto.email,
          reason: LoginFailReason.INVALID_CREDENTIALS,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
        },
        LoginFailedDto,
      );

      this.logger.warn(`Failed login attempt for email: ${authLoginDto.email}`, {
        ipAddress: metadata?.ipAddress,
      });

      throw error;
    }
  }

  /**
   * Generates a new ACT for an already authenticated user to allow context switching.
   * @param userId The ID of the authenticated user.
   * @returns A list of organizations and a new Authentication Context Token (ACT).
   */
  async reissueAct(userId: string): Promise<{ act: string; organizations: AuthOrganizationListResponseDto }> {
    const organizationAssociations = await this.profilesService.getOrganizationAssociations(userId); // This method needs to be created in ProfilesService

    const actPayload = {
      sub: userId,
      jti: uuidv4(),
    };

    const act = await this.jwtService.signAsync(actPayload, {
      secret: this.configService.get<string>('AUTH_CONTEXT_TOKEN_SECRET'),
      expiresIn: '5m',
    } as JwtSignOptions);

    return {
      act,
      organizations: { organizations: organizationAssociations },
    };
  }

  /**
   * Step 2 of Login: Generate a scoped JWT.
   * @param userId The user's ID (from the validated ACT).
   * @param organizationId The organization to scope the token to.
   * @param actJti The JTI of the ACT being consumed.
   * @param issuanceMethod How the token is being obtained (login, context-switch, refresh).
   * @param metadata Optional request metadata for event publishing.
   * @param fromOrganizationId The previous organization ID (for context-switch events).
   * @returns Access and Refresh tokens.
   */
  async getScopedToken(
    userId: string,
    organizationId: string | null,
    actJti: string,
    issuanceMethod: TokenIssuanceMethod.LOGIN | TokenIssuanceMethod.CONTEXT_SWITCH = TokenIssuanceMethod.LOGIN,
    metadata?: RequestMetadata,
    fromOrganizationId?: string,
  ): Promise<AuthTokenResponseDto> {
    // If a specific organization is requested, first verify the user is a member.
    // This prevents unnecessary permission lookups for invalid requests.
    if (organizationId !== null) {
      const hasMembership = await this.profilesService.isUserMemberOfOrg(userId, organizationId);
      if (!hasMembership) {
        throw new UnauthorizedException('User is not a member of the specified organization.');
      }
    }

    // Fetch user for email and name (OIDC standard claims)
    const user = await this.profilesService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const result = await this.rbacService.getPermissionsForUserInOrganization(userId, organizationId);
    if (!result) {
      throw new UnauthorizedException('Could not determine permissions for user in the specified organization.');
    }
    const { permissions, role } = result;
    let userType: UserType;
    let claims: CustomJWTClaims;

    // Handle platform user (Admin or Support)
    if (role === PlatformRole.PLATFORM_ADMIN || role === PlatformRole.PLATFORM_SUPPORT || role === PlatformRole.PLATFORM_VIEWER) {
      userType = UserType.PLATFORM_USER;
      claims = {
        organizationId: null,
        platformRoles: [role as PlatformRole],
        platformPermissions: permissions as PlatformPermission[],
      };
    }
    // Handle debtor user (multi-org access)
    else if (role === 'DEBTOR') {
      userType = UserType.DEBTOR_USER;

      // Get all organizations this debtor user has access to
      const allMemberships = await this.profilesService.getOrganizationAssociations(userId);
      const debtorMemberships = allMemberships.filter(m => m.role === 'DEBTOR' && m.organizationId !== null);
      const organizationIds = debtorMemberships.map(m => m.organizationId!);

      claims = {
        organizationIds,
        debtorPermissions: permissions as any[], // DebtorPermission type
        isDebtor: true,
      };
    }
    // Handle regular organization user
    else if (role) {
      userType = UserType.ORG_USER;
      claims = {
        organizationId,
        permissions: permissions as OrganizationPermission[],
        roles: [role as OrganizationRole]
      };
    }

    else {
      userType = UserType.ORG_USER;
      claims = {
        organizationId,
        permissions: permissions as OrganizationPermission[],
        roles: []
      };
    }

    // Build refresh token payload based on user type
    const refreshTokenPayload: any = { sub: userId };
    if (userType === UserType.DEBTOR_USER) {
      // For debtors, include organizationIds array in refresh token
      refreshTokenPayload.organizationIds = claims.organizationIds;
    } else {
      // For org users and platform users, include single organizationId
      refreshTokenPayload.organizationId = organizationId;
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email: user.email,
          name: user.middleName
            ? `${user.firstName} ${user.middleName} ${user.lastName}`.trim()
            : `${user.firstName} ${user.lastName}`.trim(),
          userType,
          [JWT_CLAIMS_NAMESPACE]: claims,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN'),
        } as JwtSignOptions,
      ),
      this.jwtService.signAsync(
        refreshTokenPayload,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN'),
        } as JwtSignOptions,
      ),
    ]);

    // Burn the ACT by storing its JTI in Redis
    await this.redisService.set(`jti:${actJti}`, 'burned', 'EX', 5 * 60); // Expire in 5 mins

    // Calculate token expiration
    const expiresInMinutes = parseInt(
      this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN')!.replace('m', ''),
      10,
    );
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // If this is a context switch, publish ContextSwitched event
    if (issuanceMethod === TokenIssuanceMethod.CONTEXT_SWITCH && fromOrganizationId) {
      const contextSwitchedDto = new ContextSwitchedDto();
      contextSwitchedDto.userId = userId;
      contextSwitchedDto.fromOrganizationId = fromOrganizationId;
      contextSwitchedDto.toOrganizationId = organizationId;
      contextSwitchedDto.ipAddress = metadata?.ipAddress;

    await this.eventPublisher.publish(
      EVENT_TYPES.USERS_AUTH_CONTEXT_SWITCHED,
      {
        userId: userId,
        fromOrganizationId: fromOrganizationId,
        toOrganizationId: organizationId,
        ipAddress: metadata?.ipAddress,
      },
      ContextSwitchedDto,
    );

      this.logger.log(
        `User ${userId} switched context from ${fromOrganizationId} to ${organizationId}`,
      );
    }

    // Publish TokenIssued event
    const tokenIssuedDto = new TokenIssuedDto();
    tokenIssuedDto.userId = userId;
    tokenIssuedDto.organizationId = userType === UserType.DEBTOR_USER ? null : organizationId;
    tokenIssuedDto.tokenType = TokenType.ACCESS;
    tokenIssuedDto.expiresAt = expiresAt.toISOString();
    tokenIssuedDto.issuanceMethod = issuanceMethod;
    tokenIssuedDto.ipAddress = metadata?.ipAddress;

    // Log permissions for debugging
    this.logger.debug(`Issued token for user ${userId} with permissions: ${JSON.stringify(permissions)}`);

    await this.eventPublisher.publish(
      EVENT_TYPES.USERS_AUTH_TOKEN_ISSUED,
      {
        userId: userId,
        organizationId: userType === UserType.DEBTOR_USER ? null : organizationId,
        tokenType: TokenType.ACCESS,
        expiresAt: expiresAt.toISOString(),
        issuanceMethod: issuanceMethod,
        ipAddress: metadata?.ipAddress,
      },
      TokenIssuedDto,
    );

    if (userType === UserType.DEBTOR_USER) {
      this.logger.log(`Token issued for debtor user ${userId} across ${claims.organizationIds?.length} organizations`);
    } else {
      this.logger.log(`Token issued for user ${userId} in organization ${organizationId}`);
    }

    return { accessToken, refreshToken };
  }

  /**
   * Generates a new access token from a refresh token.
   * @param refreshToken The refresh token.
   * @param metadata Optional request metadata for event publishing.
   * @returns A new access token.
   */
  async refreshToken(refreshToken: string, metadata?: RequestMetadata): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const { sub: userId, organizationId, organizationIds } = payload;

      // Ensure user still exists
      const user = await this.profilesService.findOne(userId);
      if (!user) {
        throw new UnauthorizedException('User not found.');
      }

      let userType: UserType;
      let claims: CustomJWTClaims;

      // Handle debtor refresh token (has organizationIds array)
      if (organizationIds && Array.isArray(organizationIds)) {
        // Verify at least one membership still exists
        const allMemberships = await this.profilesService.getOrganizationAssociations(userId);
        const debtorMemberships = allMemberships.filter(m => m.role === 'DEBTOR' && m.organizationId !== null);

        if (debtorMemberships.length === 0) {
          throw new UnauthorizedException('User is no longer a debtor member of any organization.');
        }

        // Get current organizationIds (may have changed since token issued)
        const currentOrgIds = debtorMemberships.map(m => m.organizationId!);

        // Get permissions from first debtor membership (all debtor memberships have same permissions)
        const { permissions } = await this.rbacService.getPermissionsForUserInOrganization(userId, currentOrgIds[0]);

        userType = UserType.DEBTOR_USER;
        claims = {
          organizationIds: currentOrgIds,
          debtorPermissions: permissions as any[], // DebtorPermission type
          isDebtor: true,
        };
      }
      // Handle org user or platform user refresh token (has single organizationId)
      else {
        const hasMembership = await this.profilesService.isUserMemberOfOrg(userId, organizationId);
        if (!hasMembership) {
          throw new UnauthorizedException('User is no longer a member of the organization.');
        }

        const { permissions, role } = await this.rbacService.getPermissionsForUserInOrganization(userId, organizationId);

        if (role === PlatformRole.PLATFORM_ADMIN || role === PlatformRole.PLATFORM_SUPPORT || role === PlatformRole.PLATFORM_VIEWER) {
          userType = UserType.PLATFORM_USER;
          claims = {
            organizationId: null,
            platformRoles: [role as PlatformRole],
            platformPermissions: permissions as PlatformPermission[],
          };
        } else if (role) {
          userType = UserType.ORG_USER;
          claims = {
            organizationId,
            permissions: permissions as OrganizationPermission[],
            roles: [role as OrganizationRole]
          };
        } else {
          userType = UserType.ORG_USER;
          claims = {
            organizationId,
            permissions: permissions as OrganizationPermission[],
            roles: [],
          };
        }
      }

      const accessToken = await this.jwtService.signAsync(
        {
          sub: userId,
          email: user.email,
          name: user.middleName
            ? `${user.firstName} ${user.middleName} ${user.lastName}`.trim()
            : `${user.firstName} ${user.lastName}`.trim(),
          userType,
          [JWT_CLAIMS_NAMESPACE]: claims,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN', '15m'),
        } as JwtSignOptions,
      );

      // Calculate token expiration
      const expiresInMinutes = parseInt(
        this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN', '15m').replace('m', ''),
        10,
      );
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      // Publish TokenIssued event
      const tokenIssuedDto = new TokenIssuedDto();
      tokenIssuedDto.userId = userId;
      tokenIssuedDto.organizationId = userType === UserType.DEBTOR_USER ? null : organizationId;
      tokenIssuedDto.tokenType = TokenType.ACCESS;
      tokenIssuedDto.expiresAt = expiresAt.toISOString();
      tokenIssuedDto.issuanceMethod = TokenIssuanceMethod.REFRESH;
      tokenIssuedDto.ipAddress = metadata?.ipAddress;

      await this.eventPublisher.publish(
        EVENT_TYPES.USERS_AUTH_TOKEN_ISSUED,
        {
          userId: user.id,
          organizationId: userType === UserType.DEBTOR_USER ? null : organizationId,
          tokenType: TokenType.ACCESS,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          issuanceMethod: TokenIssuanceMethod.REFRESH,
          ipAddress: metadata?.ipAddress,
        },
        TokenIssuedDto,
      );

      if (userType === UserType.DEBTOR_USER) {
        this.logger.log(`Token refreshed for debtor user ${userId} across ${claims.organizationIds?.length} organizations`);
      } else {
        this.logger.log(`Token refreshed for user ${userId} in organization ${organizationId}`);
      }

      return { accessToken, refreshToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  // ==========================================
  // PASSWORD RESET METHODS
  // ==========================================

  private readonly PASSWORD_RESET_EXPIRY_HOURS = 1;

  /**
   * Initiates password reset flow by generating a token and publishing an event.
   * Always returns success to prevent email enumeration attacks.
   * @param email The user's email address.
   * @param metadata Optional request metadata for event publishing.
   */
  async requestPasswordReset(email: string, metadata?: RequestMetadata): Promise<void> {
    const user = await this.profilesService.findUserByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.debug(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate secure reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date();
    resetTokenExpiresAt.setHours(resetTokenExpiresAt.getHours() + this.PASSWORD_RESET_EXPIRY_HOURS);

    // Save token to user
    await this.profilesService.setPasswordResetToken(user.id, resetToken, resetTokenExpiresAt);

    // Publish event for api-communications to send email
    await this.eventPublisher.publish(
      EVENT_TYPES.USERS_AUTH_PASSWORD_RESET_REQUESTED,
      {
        userId: user.id,
        email: user.email,
        resetToken,
        resetTokenExpiresAt: resetTokenExpiresAt.toISOString(),
        ipAddress: metadata?.ipAddress || '',
      },
      PasswordResetRequestedDto,
    );

    this.logger.log(`Password reset requested for user ${user.id}`);
  }

  /**
   * Completes password reset by validating token and updating password.
   * @param token The password reset token from the email.
   * @param newPassword The new password to set.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.profilesService.findUserByPasswordResetToken(token);

    if (!user) {
      throw new InvalidResetTokenException();
    }

    // Check if token is expired
    if (!user.passwordResetExpiresAt || new Date() > user.passwordResetExpiresAt) {
      throw new InvalidResetTokenException();
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await this.profilesService.updatePasswordAndClearResetToken(user.id, passwordHash);

    this.logger.log(`Password reset completed for user ${user.id}`);
  }
}