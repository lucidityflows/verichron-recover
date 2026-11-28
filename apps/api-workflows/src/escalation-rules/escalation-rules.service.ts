import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscalationRule } from './entities/escalation-rule.entity';
import { CreateEscalationRuleDto } from './dto/create-escalation-rule.dto';
import { UpdateEscalationRuleDto } from './dto/update-escalation-rule.dto';
import { EscalationRuleResponseDto } from './dto/escalation-rule-response.dto';
import { RequestContext } from '../core';

@Injectable()
export class EscalationRulesService {
  constructor(
    @InjectRepository(EscalationRule)
    private readonly escalationRuleRepository: Repository<EscalationRule>,
    private readonly requestContext: RequestContext,
  ) {}

  async create(
    organizationId: string,
    createEscalationRuleDto: CreateEscalationRuleDto,
  ): Promise<EscalationRuleResponseDto> {
    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new BadRequestException('User context is missing.');
    }

    const newRule = this.escalationRuleRepository.create({
      ...createEscalationRuleDto,
      organizationId,
      createdBy: userId,
    });
    const savedRule = await this.escalationRuleRepository.save(newRule);
    return new EscalationRuleResponseDto(savedRule);
  }

  async findAll(organizationId: string): Promise<EscalationRuleResponseDto[]> {
    const rules = await this.escalationRuleRepository.find({ where: { organizationId } });
    return rules.map((rule) => new EscalationRuleResponseDto(rule));
  }

  async findOne(organizationId: string, ruleId: string): Promise<EscalationRuleResponseDto> {
    const rule = await this.escalationRuleRepository.findOne({ where: { organizationId, id: ruleId } });
    if (!rule) {
      throw new NotFoundException(`Escalation rule with ID "${ruleId}" not found for organization "${organizationId}".`);
    }
    return new EscalationRuleResponseDto(rule);
  }

  async update(
    organizationId: string,
    ruleId: string,
    updateEscalationRuleDto: UpdateEscalationRuleDto,
  ): Promise<EscalationRuleResponseDto> {
    const rule = await this.escalationRuleRepository.findOne({ where: { organizationId, id: ruleId } });
    if (!rule) {
      throw new NotFoundException(`Escalation rule with ID "${ruleId}" not found for organization "${organizationId}".`);
    }

    Object.assign(rule, updateEscalationRuleDto);
    const updatedRule = await this.escalationRuleRepository.save(rule);
    return new EscalationRuleResponseDto(updatedRule);
  }

  async remove(organizationId: string, ruleId: string): Promise<void> {
    const result = await this.escalationRuleRepository.delete({ organizationId, id: ruleId });
    if (result.affected === 0) {
      throw new NotFoundException(`Escalation rule with ID "${ruleId}" not found for organization "${organizationId}".`);
    }
  }
}
