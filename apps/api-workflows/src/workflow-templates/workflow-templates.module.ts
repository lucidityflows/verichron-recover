import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { WorkflowTemplatesController } from './workflow-templates.controller';
import { WorkflowTemplate } from './entities/workflow-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowTemplate])],
  controllers: [WorkflowTemplatesController],
  providers: [WorkflowTemplatesService],
  exports: [WorkflowTemplatesService],
})
export class WorkflowTemplatesModule {}
