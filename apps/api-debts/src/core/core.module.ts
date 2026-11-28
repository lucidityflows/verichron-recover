import { Module, Global } from '@nestjs/common';
import { RequestContext } from './services/request-context.service';

/**
 * CoreModule
 *
 * Global module that provides core services available throughout the application.
 * Marked as @Global so it doesn't need to be imported into every module.
 *
 * Exports:
 * - RequestContext: Request-scoped service for accessing authenticated user/org context
 */
@Global()
@Module({
  providers: [RequestContext],
  exports: [RequestContext],
})
export class CoreModule {}
