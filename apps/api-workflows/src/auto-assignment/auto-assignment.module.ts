import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoAssignmentService } from './auto-assignment.service';
import { AutoAssignmentController } from './auto-assignment.controller';
import { AutoAssignmentConfig } from './entities/auto-assignment-config.entity';
import { AutoAssignmentExecutorService } from './auto-assignment-executor.service';
import { CommandsModule } from '../commands/commands.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import {
  AutoAssignmentTriggerListener,
  AutoAssignmentResultListener,
} from './listeners';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutoAssignmentConfig]),
    CommandsModule,
    SchedulerModule,
  ],
  controllers: [AutoAssignmentController],
  providers: [
    AutoAssignmentService,
    AutoAssignmentExecutorService,
    AutoAssignmentTriggerListener,
    AutoAssignmentResultListener,
  ],
  exports: [
    AutoAssignmentService,
    AutoAssignmentExecutorService,
    TypeOrmModule,
  ],
})
export class AutoAssignmentModule {}