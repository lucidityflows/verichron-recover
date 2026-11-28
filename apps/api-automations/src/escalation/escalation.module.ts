import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EscalationService } from './escalation.service';
import { EscalationExecutorService } from './escalation-executor.service';

@Module({
  imports: [
    HttpModule,
  ],
  providers: [EscalationService, EscalationExecutorService],
  exports: [EscalationService],
})
export class EscalationModule {}