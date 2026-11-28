import { IoAdapter } from '@nestjs/platform-socket.io';
import { type ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { type INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * RedisIoAdapter
 * 
 * Custom Socket.io adapter that uses Redis for synchronization across multiple API instances.
 * This ensures that a broadcast sent from Server A will reach clients connected to Server B.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: any;

  constructor(private app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const configService = this.app.get(ConfigService);
    const redisUrl = configService.get<string>('REDIS_URL');
    
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set for RedisIoAdapter');
    }

    const pubClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
    });
    
    const subClient = pubClient.duplicate();

    await Promise.all([
      pubClient.connect().catch(() => {}), // ioredis might already be connecting
      subClient.connect().catch(() => {}),
    ]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
