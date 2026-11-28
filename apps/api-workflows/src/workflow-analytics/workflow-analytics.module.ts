import { Module } from '@nestjs/common';
import { WorkflowAnalyticsService } from './workflow-analytics.service';
import { WorkflowAnalyticsController } from './workflow-analytics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowExecution } from '../workflow-executions/entities/workflow-execution.entity';
import { WorkflowRule } from '../workflow-rules/entities/workflow-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowExecution, WorkflowRule])], // Need WorkflowExecution and WorkflowRule to calculate analytics
  controllers: [WorkflowAnalyticsController],
  providers: [WorkflowAnalyticsService],
  exports: [WorkflowAnalyticsService],
})
export class WorkflowAnalyticsModule {}
