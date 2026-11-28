import { Global, Module, OnModuleDestroy, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          // Add other Redis options as needed
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async onModuleInit() {
    this.redisClient.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    try {
      await this.redisClient.ping();
      this.logger.log('✅ Redis connected successfully');
    } catch (err) {
      this.logger.error('Could not connect to Redis:', err);
    }
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
