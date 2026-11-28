import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SchedulerService } from './scheduler.service';
import { SchedulerProcessor } from './scheduler.processor';
import { WorkflowRulesModule } from '../workflow-rules/workflow-rules.module';
import { AutoAssignmentModule } from '../auto-assignment/auto-assignment.module';
import { EscalationRulesModule } from '../escalation-rules/escalation-rules.module';
import { EngineModule } from '../engine/engine.module';
import { CommandsModule } from '../commands/commands.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get<string>('REDIS_PORT') || '6379', 10),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'workflow-queue',
    }),
    CommandsModule,
    forwardRef(() => WorkflowRulesModule),
    forwardRef(() => AutoAssignmentModule),
    forwardRef(() => EscalationRulesModule),
    forwardRef(() => EngineModule),
  ],
  providers: [SchedulerService, SchedulerProcessor],
  exports: [SchedulerService],
})
export class SchedulerModule {}