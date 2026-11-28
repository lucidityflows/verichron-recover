import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ActStrategy extends PassportStrategy(Strategy, 'act') {
  constructor(
    private readonly configService: ConfigService,
  ) {
    const secret = configService.get<string>('AUTH_CONTEXT_TOKEN_SECRET');
    if (!secret) {
      throw new Error('AUTH_CONTEXT_TOKEN_SECRET environment variable is not set');
    }

    super({
      jwtFromRequest: (req: Request) => {
        if (req && req.cookies) {
          return req.cookies['act'];
        }
        return null;
      },
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // The payload is { sub, jti, iat, exp }
    // We return the whole payload so the guard can access the jti.
    return payload;
  }
}
