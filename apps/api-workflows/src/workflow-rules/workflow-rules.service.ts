import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowRule } from './entities/workflow-rule.entity';
import { CreateWorkflowRuleDto } from './dto/create-workflow-rule.dto';
import { UpdateWorkflowRuleDto } from './dto/update-workflow-rule.dto';
import { WorkflowRuleResponseDto } from './dto/workflow-rule-response.dto';
import { RequestContext } from '../core';

@Injectable()
export class WorkflowRulesService {
  constructor(
    @InjectRepository(WorkflowRule)
    private readonly workflowRuleRepository: Repository<WorkflowRule>,
    private readonly requestContext: RequestContext,
  ) {}

  async create(
    organizationId: string,
    createWorkflowRuleDto: CreateWorkflowRuleDto,
  ): Promise<WorkflowRuleResponseDto> {
    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new BadRequestException('User context is missing.');
    }

    const newRule = this.workflowRuleRepository.create({
      ...createWorkflowRuleDto,
      organizationId,
      createdBy: userId,
    });
    const savedRule = await this.workflowRuleRepository.save(newRule);
    return new WorkflowRuleResponseDto(savedRule);
  }

  async findAll(organizationId: string): Promise<WorkflowRuleResponseDto[]> {
    const rules = await this.workflowRuleRepository.find({ where: { organizationId } });
    return rules.map((rule) => new WorkflowRuleResponseDto(rule));
  }

  async findOne(organizationId: string, ruleId: string): Promise<WorkflowRuleResponseDto> {
    const rule = await this.workflowRuleRepository.findOne({ where: { organizationId, id: ruleId } });
    if (!rule) {
      throw new NotFoundException(`Workflow rule with ID "${ruleId}" not found for organization "${organizationId}".`);
    }
    return new WorkflowRuleResponseDto(rule);
  }

  async update(
    organizationId: string,
    ruleId: string,
    updateWorkflowRuleDto: UpdateWorkflowRuleDto,
  ): Promise<WorkflowRuleResponseDto> {
    const rule = await this.workflowRuleRepository.findOne({ where: { organizationId, id: ruleId } });
    if (!rule) {
      throw new NotFoundException(`Workflow rule with ID "${ruleId}" not found for organization "${organizationId}".`);
    }

    Object.assign(rule, updateWorkflowRuleDto);
    const updatedRule = await this.workflowRuleRepository.save(rule);
    return new WorkflowRuleResponseDto(updatedRule);
  }

  async remove(organizationId: string, ruleId: string): Promise<void> {
    const result = await this.workflowRuleRepository.delete({ organizationId, id: ruleId });
    if (result.affected === 0) {
      throw new NotFoundException(`Workflow rule with ID "${ruleId}" not found for organization "${organizationId}".`);
    }
  }

  async toggle(organizationId: string, ruleId: string): Promise<WorkflowRuleResponseDto> {
    const rule = await this.workflowRuleRepository.findOne({ where: { organizationId, id: ruleId } });
    if (!rule) {
      throw new NotFoundException(`Workflow rule with ID "${ruleId}" not found for organization "${organizationId}".`);
    }

    rule.enabled = !rule.enabled;
    const updatedRule = await this.workflowRuleRepository.save(rule);
    return new WorkflowRuleResponseDto(updatedRule);
  }
}
