import { createParamDecorator, ExecutionContext, InternalServerErrorException, Logger } from '@nestjs/common';
import { JWT_CLAIMS_NAMESPACE } from '@verichron/contracts';

export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const logger = new Logger('OrganizationIdDecorator');
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user[JWT_CLAIMS_NAMESPACE]) {
      logger.error('Missing user or claims in request', {
        hasUser: !!user,
        hasClaims: !!user?.[JWT_CLAIMS_NAMESPACE],
      });
      throw new InternalServerErrorException(
        'Authentication context is missing. This is a system error.',
      );
    }

    const organizationId = user[JWT_CLAIMS_NAMESPACE].organizationId;

    // organizationId can be null for platform admins - this is valid
    // only throw if it's undefined (which indicates a malformed token)
    if (organizationId === undefined) {
      logger.error('organizationId is undefined in JWT claims', {
        userId: user.sub,
      });
      throw new InternalServerErrorException(
        'Organization context is malformed in authentication token.',
      );
    }

    return organizationId; // Can be string or null
  },
);
