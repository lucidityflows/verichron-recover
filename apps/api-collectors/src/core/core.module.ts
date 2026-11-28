import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RequestContext } from './services/request-context.service';
import { TeamsClientService } from './services/teams-client.service';

/**
 * CoreModule
 *
 * Global module that provides core services available throughout the application.
 * Marked as @Global so it doesn't need to be imported into every module.
 *
 * Exports:
 * - RequestContext: Request-scoped service for accessing authenticated user/org context
 * - TeamsClientService: Service for making internal API calls to api-organizations for team queries
 */
@Global()
@Module({
  imports: [HttpModule],
  providers: [RequestContext, TeamsClientService],
  exports: [RequestContext, TeamsClientService],
})
export class CoreModule {}
