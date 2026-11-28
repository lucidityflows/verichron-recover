import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GatewayFactoryService } from './gateway-factory.service';
import { SendGridService } from './providers/sendgrid/sendgrid.service';
import { TwilioService } from './providers/twilio/twilio.service';
import { MockEmailService } from './providers/mock/mock-email.service';
import { MockSmsService } from './providers/mock/mock-sms.service';
import { SendGridWebhookController } from './providers/sendgrid/sendgrid-webhook.controller';
import { TwilioWebhookController } from './providers/twilio/twilio-webhook.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [ConfigModule, LogsModule],
  providers: [
    GatewayFactoryService,
    SendGridService,
    TwilioService,
    MockEmailService,
    MockSmsService,
  ],
  controllers: [
    SendGridWebhookController,
    TwilioWebhookController,
  ],
  exports: [GatewayFactoryService],
})
export class GatewaysModule {}
