import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { DispatchController } from './dispatch.controller';
import { TemplatesModule } from '../templates/templates.module';
import { LogsModule } from '../logs/logs.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [
    TemplatesModule,
    LogsModule,
    GatewaysModule,
    ComplianceModule,
  ],
  providers: [DispatchService],
  controllers: [DispatchController],
  exports: [DispatchService],
})
export class DispatchModule {}
