import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          throw new Error('REDIS_URL environment variable is not set');
        }

        const client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          connectTimeout: 10000,
          commandTimeout: 5000,
          retryStrategy: (times) => {
            if (times > 3) {
              console.error('Redis connection failed after 3 retries');
              return null;
            }
            return Math.min(times * 100, 2000);
          },
        });

        client.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        client.on('error', (err) => {
          console.error('❌ Redis connection error:', err.message);
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
