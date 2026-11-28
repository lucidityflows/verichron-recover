import { registerAs } from '@nestjs/config';

/**
 * Redis Configuration
 *
 * Used for caching and rate limiting.
 * Supports Redis Sentinel for high availability in production.
 */
export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'comms:',

  // Connection options
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,

  // Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000,

  // Sentinel configuration (for production HA)
  sentinels: process.env.REDIS_SENTINELS
    ? JSON.parse(process.env.REDIS_SENTINELS)
    : undefined,
  sentinelName: process.env.REDIS_SENTINEL_NAME || undefined,

  // Rate limiting defaults
  rateLimits: {
    dispatch: {
      points: parseInt(process.env.RATE_LIMIT_DISPATCH_POINTS || '100', 10),
      duration: parseInt(process.env.RATE_LIMIT_DISPATCH_DURATION || '60', 10),
    },
    webhook: {
      points: parseInt(process.env.RATE_LIMIT_WEBHOOK_POINTS || '1000', 10),
      duration: parseInt(process.env.RATE_LIMIT_WEBHOOK_DURATION || '60', 10),
    },
  },
}));
