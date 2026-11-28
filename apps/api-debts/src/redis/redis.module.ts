import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // Make RedisService available globally
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
