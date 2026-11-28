import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JWT_CLAIMS_NAMESPACE } from '@verichron/contracts';
import type { IActorSnapshot } from '@verichron/contracts';
import { UserType } from '@verichron/enums';

/**
 * Decorator to extract the current actor snapshot for audit logging.
 * Returns an IActorSnapshot-compatible object from the JWT token.
 *
 * This decorator is designed for audit purposes - it captures the actor's
 * identity at the time of the request, including their role context.
 *
 * Usage:
 * @Post()
 * create(@CurrentActor() actor: IActorSnapshot, @Body() dto: CreateDto) {
 *   return this.service.create(dto, actor);
 * }
 *
 * The returned actor snapshot includes:
 * - id: User ID (from JWT sub claim)
 * - name: User's full name (from JWT name claim)
 * - email: User's email (from JWT email claim)
 * - role: User's role in the current context (derived from claims)
 */
export const CurrentActor = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IActorSnapshot => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // Return a system actor if no user context (should not happen with guards)
      return {
        id: 'SYSTEM',
        name: 'System',
        email: 'system@verichron.com',
        role: 'SYSTEM',
      };
    }

    const claims = user[JWT_CLAIMS_NAMESPACE];

    // Determine role based on user type
    let role: string;
    if (user.userType === UserType.PLATFORM_USER) {
      role = claims?.platformRoles?.[0] || 'PLATFORM_USER';
    } else if (user.userType === UserType.DEBTOR_USER) {
      role = 'DEBTOR';
    } else {
      role = claims?.roles?.[0] || 'ORG_USER';
    }

    return {
      id: user.sub,
      name: user.name || 'Unknown User',
      email: user.email || 'unknown@verichron.com',
      role,
    };
  },
);
