import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { CallsModule } from '../calls/calls.module';
import { TwilioWebhookMiddleware } from '../core/middleware/twilio-webhook.middleware';
import { TwilioConfigModule } from '../twilio-config/twilio-config.module';
import { CallLog } from '../calls/entities/call-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallLog]), // Make CallLogRepository available here
    CallsModule,
    TwilioConfigModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TwilioWebhookMiddleware)
      .forRoutes(WebhooksController);
  }
}
