import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { REDIS_CLIENT } from '../redis/redis.module';

/**
 * CacheService
 *
 * Provides Redis-based caching with TTL management for analytics data.
 * Target: 80% cache hit rate to reduce compute costs.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      const data = JSON.stringify(value);
      await this.redis.setex(key, ttlSeconds, data);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Build cache key from prefix and parameters
   *
   * Pattern: {prefix}:{organizationId}:{hash(params)}
   *
   * Example: analytics:dashboard_summary:org-123:a3f2b1c4
   */
  buildKey(prefix: string, params: Record<string, any>): string {
    // Sort params for consistent hashing
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    // Create hash of params
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(sortedParams))
      .digest('hex')
      .substring(0, 8);

    const organizationId = params.organizationId || 'global';
    return `${prefix}:${organizationId}:${hash}`;
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache keys matching pattern
   *
   * Example: invalidatePattern('analytics:*:org-123:*')
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.redis.del(...keys);
      this.logger.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      return keys.length;
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ keyCount: number; memoryUsage: string }> {
    try {
      const dbSize = await this.redis.dbsize();
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return {
        keyCount: dbSize,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return { keyCount: 0, memoryUsage: 'error' };
    }
  }
}
