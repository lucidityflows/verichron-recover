import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscalationRulesService } from './escalation-rules.service';
import { EscalationRulesController } from './escalation-rules.controller';
import { EscalationRule } from './entities/escalation-rule.entity';
import { EscalationExecution } from './entities/escalation-execution.entity';
import { EscalationExecutorService } from './escalation-executor.service';
import {
  EscalationTriggerListener,
  EscalationResultListener,
} from './listeners';

@Module({
  imports: [TypeOrmModule.forFeature([EscalationRule, EscalationExecution])],
  controllers: [EscalationRulesController],
  providers: [
    EscalationRulesService,
    EscalationExecutorService,
    EscalationTriggerListener,
    EscalationResultListener,
  ],
  exports: [EscalationRulesService, EscalationExecutorService, TypeOrmModule],
})
export class EscalationRulesModule {}