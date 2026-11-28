import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimeGateway } from './realtime.gateway';
import { PubSubBridgeService } from './pubsub-bridge.service';
import { RealtimeDocsController } from './realtime-docs.controller';
import { RedisModule } from '../core/redis';
import { NotificationCreatedListener } from './listeners/notification-created.listener';

@Module({
  imports: [ConfigModule, RedisModule],
  controllers: [RealtimeDocsController],
  providers: [RealtimeGateway, PubSubBridgeService, NotificationCreatedListener],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
