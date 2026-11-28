import { Module } from '@nestjs/common';
import { SandboxController } from './sandbox.controller';
import { SandboxOpsController } from './sandbox.ops.controller';
import { SandboxService } from './sandbox.service';
import { TwilioConfigModule } from '../twilio-config/twilio-config.module';

@Module({
  imports: [TwilioConfigModule],
  controllers: [SandboxController, SandboxOpsController],
  providers: [SandboxService],
})
export class SandboxModule {}
