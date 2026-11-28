import { Module, Global } from '@nestjs/common';
import { RequestContext } from './services/request-context.service';
import { RedisModule } from './redis';
import { CacheService } from './cache';
import { CircuitBreakerService } from './circuit-breaker';
import { HealthController } from './health';

/**
 * CoreModule
 *
 * Global module that provides core infrastructure services.
 * Marked as @Global so it doesn't need to be imported into every module.
 *
 * Exports:
 * - RequestContext: Request-scoped service for accessing authenticated user/org context
 * - CacheService: Redis-based caching with TTL management
 * - CircuitBreakerService: Circuit breaker pattern for internal service calls
 */
@Global()
@Module({
  imports: [RedisModule],
  controllers: [HealthController],
  providers: [RequestContext, CacheService, CircuitBreakerService],
  exports: [RequestContext, CacheService, CircuitBreakerService],
})
export class CoreModule {}
