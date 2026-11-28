import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import {
  UserType,
  OrganizationRole,
  OrganizationPermission,
  PlatformRole,
  PlatformPermission,
  DebtorPermission
} from '@verichron/enums';
import {
  JWT_CLAIMS_NAMESPACE
} from '@verichron/contracts';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string; // User email (OIDC standard claim)
  name: string; // User full name (OIDC standard claim)
  userType: UserType;
  [JWT_CLAIMS_NAMESPACE]: {
    organizationId: string | null; // ✅ NULL for platform users
    // Platform user fields
    platformRoles?: PlatformRole[];
    platformPermissions?: PlatformPermission[];
    // Organization user fields
    roles?: OrganizationRole[];
    permissions?: OrganizationPermission[];
    // Debtor fields
    organizationIds?: string[]; // Multi-org access for debtor users
    debtorPermissions?: DebtorPermission[]; // Self-scoped permissions
    isDebtor?: boolean; // Flag for debtor user type
  };
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    // private readonly profilesService: ProfilesService, // Will be added later
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Validate payload structure
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    if (!payload.userType) {
      throw new UnauthorizedException('Invalid token: missing user type');
    }

    // Validate claims namespace exists
    const claims = payload[JWT_CLAIMS_NAMESPACE];
    if (!claims) {
      throw new UnauthorizedException('Invalid token: missing claims namespace');
    }

    // ✅ Platform users have NULL organizationId - this is valid
    if (payload.userType === UserType.PLATFORM_USER) {
      if (claims.organizationId !== null) {
        throw new UnauthorizedException(
          'Invalid token: platform user must have null organizationId'
        );
      }

      // Platform users have platformPermissions, not regular permissions
      if (!claims.platformPermissions || claims.platformPermissions.length === 0) {
        throw new UnauthorizedException(
          'Invalid token: platform user must have platformPermissions'
        );
      }
    } else if (payload.userType === UserType.DEBTOR_USER) {
      // Debtors have organizationIds array (multi-org access)
      if (!claims.organizationIds || !Array.isArray(claims.organizationIds)) {
        throw new UnauthorizedException(
          'Invalid token: debtor user must have organizationIds array'
        );
      }

      if (claims.organizationIds.length === 0) {
        throw new UnauthorizedException(
          'Invalid token: debtor user must have at least one organization'
        );
      }

      // Debtors have debtorPermissions, not regular permissions
      if (!claims.debtorPermissions || claims.debtorPermissions.length === 0) {
        throw new UnauthorizedException(
          'Invalid token: debtor user must have debtorPermissions'
        );
      }

      // Validate isDebtor flag is set
      if (claims.isDebtor !== true) {
        throw new UnauthorizedException(
          'Invalid token: debtor user token must have isDebtor=true'
        );
      }
    } else {
      // Regular organization users must have organizationId
      if (!claims.organizationId) {
        throw new UnauthorizedException(
          'Invalid token: missing organization context'
        );
      }
    }

    // TODO: Add user validation by calling ProfilesService to ensure the user still exists.
    // const user = await this.profilesService.findOne(payload.sub);
    // if (!user) {
    //   throw new UnauthorizedException('User not found.');
    // }

    return payload;
  }
}