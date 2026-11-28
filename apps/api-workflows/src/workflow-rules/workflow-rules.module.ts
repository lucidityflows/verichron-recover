import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowRulesService } from './workflow-rules.service';
import { WorkflowRulesController } from './workflow-rules.controller';
import { WorkflowRule } from './entities/workflow-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowRule])],
  controllers: [WorkflowRulesController],
  providers: [WorkflowRulesService],
  exports: [WorkflowRulesService],
})
export class WorkflowRulesModule {}
