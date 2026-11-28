/**
 * @file RequestContextInterceptor
 * @description Interceptor responsible for populating the request-scoped `RequestContext` service
 *   with user and organization context information extracted from the incoming HTTP request.
 *
 * @overview
 *   - **Context Population**: Extracts `user` and `activeContext` data from the `request` object.
 *     This data is typically set by authentication (`JwtAuthGuard`) and authorization (`OrgContextGuard`)
 *     guards that run earlier in the request pipeline.
 *   - **Service Integration**: Uses the `RequestContext` service's `setUser` method to store
 *     this information, making it accessible throughout the rest of the request's lifecycle
 *     (e.g., in services, controllers, and other interceptors).
 *   - **Global Application**: Designed to be applied globally to ensure that `RequestContext`
 *     is consistently available for all incoming requests.
 *
 * @usage
 *   This interceptor should be registered globally in `app.module.ts`.
 *
 * @example
 * // In app.module.ts:
 * // providers: [
 * //   { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
 * // ]
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContext } from '../services/request-context.service';

/**
 * RequestContextInterceptor populates the RequestContext service with user info
 * from the request object (set by JwtAuthGuard and OrgContextGuard)
 *
 * This should be applied globally so RequestContext is available in all services
 *
 * IMPORTANT: Must be REQUEST-scoped to inject the REQUEST-scoped RequestContext service
 */
@Injectable({ scope: Scope.REQUEST })
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const activeContext = request.activeContext;

    // Populate RequestContext if user is authenticated
    if (user) {
      this.requestContext.setUser({
        userId: user.sub,
        username: user.username,
        email: user.email,
        orgId: activeContext?.orgId,
        roles: activeContext?.roles,
        permissions: activeContext?.permissions,
        platformRoles: user.platformRoles,
      });
    }

    return next.handle();
  }
}
