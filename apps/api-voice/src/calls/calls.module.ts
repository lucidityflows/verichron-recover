import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { CallLog } from './entities/call-log.entity';
import { TwilioConfigModule } from '../twilio-config/twilio-config.module';
import { CommunicationsService } from '../shared/services/communications.service';

@Module({
  imports: [TypeOrmModule.forFeature([CallLog]), TwilioConfigModule],
  controllers: [CallsController],
  providers: [CallsService, CommunicationsService],
  exports: [CallsService],
})
export class CallsModule {}

