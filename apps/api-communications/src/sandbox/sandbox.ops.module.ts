import { Module } from '@nestjs/common';
import { SandboxOpsController } from './sandbox.ops.controller';
import { SandboxService } from './sandbox.service';
import { TemplatesModule } from '../templates/templates.module';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [TemplatesModule, GatewaysModule],
  controllers: [SandboxOpsController],
  providers: [SandboxService],
})
export class SandboxOpsModule {}
