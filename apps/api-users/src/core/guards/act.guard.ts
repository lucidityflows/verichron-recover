import { ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AuthContextTokenGuard extends AuthGuard('act') {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // super.canActivate(context) will run the ActStrategy and attach the payload to request.user
    const can = await super.canActivate(context) as boolean;
    if (!can) {
        return false;
    }

    const request = context.switchToHttp().getRequest();
    const { jti } = request.user;

    // Single-Use Enforcement
    const isUsed = await this.redisService.get(`jti:${jti}`);
    if (isUsed) {
      // This token has already been used.
      throw new ForbiddenException('This authentication context token has already been used.');
    }

    return true;
  }
}
