import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoAssignmentConfig } from './entities/auto-assignment-config.entity';
import { CreateAutoAssignmentDto } from './dto/create-auto-assignment.dto';
import { UpdateAutoAssignmentDto } from './dto/update-auto-assignment.dto';
import { AutoAssignmentConfigResponseDto } from './dto/auto-assignment-config-response.dto';
import { RequestContext } from '../core';

@Injectable()
export class AutoAssignmentService {
  constructor(
    @InjectRepository(AutoAssignmentConfig)
    private readonly autoAssignmentConfigRepository: Repository<AutoAssignmentConfig>,
    private readonly requestContext: RequestContext,
  ) {}

  async create(
    organizationId: string,
    createAutoAssignmentDto: CreateAutoAssignmentDto,
  ): Promise<AutoAssignmentConfigResponseDto> {
    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new BadRequestException('User context is missing.');
    }

    const newConfig = this.autoAssignmentConfigRepository.create({
      ...createAutoAssignmentDto,
      organizationId,
      createdBy: userId,
    });
    const savedConfig = await this.autoAssignmentConfigRepository.save(newConfig);
    return new AutoAssignmentConfigResponseDto(savedConfig);
  }

  async findAll(organizationId: string): Promise<AutoAssignmentConfigResponseDto[]> {
    const configs = await this.autoAssignmentConfigRepository.find({ where: { organizationId } });
    return configs.map((config) => new AutoAssignmentConfigResponseDto(config));
  }

  async findOne(organizationId: string, configId: string): Promise<AutoAssignmentConfig> {
    const config = await this.autoAssignmentConfigRepository.findOne({ where: { organizationId, id: configId } });
    if (!config) {
      throw new NotFoundException(`Auto-assignment configuration with ID "${configId}" not found for organization "${organizationId}".`);
    }
    return config;
  }

  async update(
    organizationId: string,
    configId: string,
    updateAutoAssignmentDto: UpdateAutoAssignmentDto,
  ): Promise<AutoAssignmentConfigResponseDto> {
    const config = await this.autoAssignmentConfigRepository.findOne({ where: { organizationId, id: configId } });
    if (!config) {
      throw new NotFoundException(`Auto-assignment configuration with ID "${configId}" not found for organization "${organizationId}".`);
    }

    Object.assign(config, updateAutoAssignmentDto);
    const updatedConfig = await this.autoAssignmentConfigRepository.save(config);
    return new AutoAssignmentConfigResponseDto(updatedConfig);
  }

  async remove(organizationId: string, configId: string): Promise<void> {
    const result = await this.autoAssignmentConfigRepository.delete({ organizationId, id: configId });
    if (result.affected === 0) {
      throw new NotFoundException(`Auto-assignment configuration with ID "${configId}" not found for organization "${organizationId}".`);
    }
  }

  async toggle(organizationId: string, configId: string): Promise<AutoAssignmentConfigResponseDto> {
    const config = await this.autoAssignmentConfigRepository.findOne({ where: { organizationId, id: configId } });
    if (!config) {
      throw new NotFoundException(`Auto-assignment configuration with ID "${configId}" not found for organization "${organizationId}".`);
    }

    config.enabled = !config.enabled;
    const updatedConfig = await this.autoAssignmentConfigRepository.save(config);
    return new AutoAssignmentConfigResponseDto(updatedConfig);
  }
}
