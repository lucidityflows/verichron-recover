import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowExecutionsService } from './workflow-executions.service';
import { WorkflowExecutionsController } from './workflow-executions.controller';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowActionResultListener } from './listeners';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowExecution])],
  controllers: [WorkflowExecutionsController],
  providers: [WorkflowExecutionsService, WorkflowActionResultListener],
  exports: [WorkflowExecutionsService],
})
export class WorkflowExecutionsModule {}
