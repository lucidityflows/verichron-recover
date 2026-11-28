import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current user ID from the request object.
 * This assumes the JWT guard has already populated req.user with user information.
 *
 * Usage:
 * @Get()
 * findAll(@CurrentUserId() userId: string) {
 *   // userId is extracted from the JWT token
 * }
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.userId || request.user?.id || request.user?.sub;
  },
);
