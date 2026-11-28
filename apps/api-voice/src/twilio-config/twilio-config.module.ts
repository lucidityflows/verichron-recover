import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwilioConfigService } from './twilio-config.service';
import { TwilioConfigController } from './twilio-config.controller';
import { TwilioConfig } from './entities/twilio-config.entity';
// We will need an encryption service, let's assume it's in core for now
import { EncryptionService } from '../core/services/encryption.service';

@Module({
  imports: [TypeOrmModule.forFeature([TwilioConfig])],
  controllers: [TwilioConfigController],
  providers: [TwilioConfigService, EncryptionService], // Provide EncryptionService
  exports: [TwilioConfigService],
})
export class TwilioConfigModule {}