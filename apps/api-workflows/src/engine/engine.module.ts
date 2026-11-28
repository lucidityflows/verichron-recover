import { Module, forwardRef } from '@nestjs/common';
import { EngineService } from './engine.service';
import { WorkflowRulesModule } from '../workflow-rules/workflow-rules.module';
import { WorkflowExecutionsModule } from '../workflow-executions/workflow-executions.module';
import { CommandsModule } from '../commands/commands.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import {
  DebtCreatedListener,
  PaymentReceivedListener,
  PromiseBrokenListener,
  PaymentFailedListener,
} from './listeners';

@Module({
  imports: [
    WorkflowRulesModule,
    WorkflowExecutionsModule,
    CommandsModule,
    forwardRef(() => SchedulerModule),
  ],
  providers: [
    EngineService,
    DebtCreatedListener,
    PaymentReceivedListener,
    PromiseBrokenListener,
    PaymentFailedListener,
  ],
  exports: [EngineService],
})
export class EngineModule {}