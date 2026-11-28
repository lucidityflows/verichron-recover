import { Module } from '@nestjs/common';
import { TokensService } from './tokens.service';
import { TokensController } from './tokens.controller';
import { TwilioConfigModule } from '../twilio-config/twilio-config.module';

@Module({
  imports: [TwilioConfigModule], // Import so we can use TwilioConfigService
  controllers: [TokensController],
  providers: [TokensService],
})
export class TokensModule {}
