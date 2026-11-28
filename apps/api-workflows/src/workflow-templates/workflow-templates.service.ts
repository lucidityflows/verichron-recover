import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowTemplate } from './entities/workflow-template.entity';
import { WorkflowTemplateResponseDto } from './dto/workflow-template-response.dto';

@Injectable()
export class WorkflowTemplatesService {
  constructor(
    @InjectRepository(WorkflowTemplate)
    private readonly workflowTemplateRepository: Repository<WorkflowTemplate>,
  ) {}

  async findAll(organizationId: string, category?: string): Promise<WorkflowTemplateResponseDto[]> {
    // For now, templates are system-wide. organizationId is for consistency and future filtering.
    // In a real scenario, this might filter based on organization's enabled features.
    const where: any = { isSystemTemplate: true };
    if (category) {
      where.category = category;
    }

    const templates = await this.workflowTemplateRepository.find({ where });
    return templates.map((template) => new WorkflowTemplateResponseDto(template));
  }

  async findOne(organizationId: string, templateId: string): Promise<WorkflowTemplateResponseDto> {
    const template = await this.workflowTemplateRepository.findOne({
      where: { id: templateId, isSystemTemplate: true },
    });
    if (!template) {
      throw new NotFoundException(`Workflow template with ID "${templateId}" not found.`);
    }
    return new WorkflowTemplateResponseDto(template);
  }
}
