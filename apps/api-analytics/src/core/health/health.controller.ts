import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@verichron/auth';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { CacheService } from '../cache/cache.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly cacheService: CacheService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  /**
   * Health check endpoint for Cloud Run
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-analytics',
    };
  }

  /**
   * Readiness check for Cloud Run
   */
  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async ready() {
    try {
      // Check Redis connection
      await this.redis.ping();

      // Get cache stats
      const cacheStats = await this.cacheService.getStats();

      // Get circuit breaker stats
      const circuitStats = this.circuitBreaker.getAllStats();

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          redis: 'ok',
          cache: {
            keys: cacheStats.keyCount,
            memory: cacheStats.memoryUsage,
          },
          circuits: circuitStats,
        },
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Detailed status endpoint for monitoring
   */
  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Detailed status' })
  @ApiResponse({ status: 200, description: 'Detailed service status' })
  async status() {
    try {
      const cacheStats = await this.cacheService.getStats();
      const circuitStats = this.circuitBreaker.getAllStats();

      return {
        service: 'api-analytics',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
        },
        cache: cacheStats,
        circuits: circuitStats,
      };
    } catch (error) {
      return {
        service: 'api-analytics',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
