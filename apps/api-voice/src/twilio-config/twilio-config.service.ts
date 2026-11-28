import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwilioConfig } from './entities/twilio-config.entity';
import { CreateTwilioConfigDto } from './dto/create-twilio-config.dto';
import { UpdateTwilioConfigDto } from './dto/update-twilio-config.dto';
import { EncryptionService } from '../core/services/encryption.service';
import { TwilioConfigResponseDto } from './dto/twilio-config-response.dto';

@Injectable()
export class TwilioConfigService {
  constructor(
    @InjectRepository(TwilioConfig)
    private readonly twilioConfigRepository: Repository<TwilioConfig>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(
    organizationId: string,
    createTwilioConfigDto: CreateTwilioConfigDto,
  ): Promise<TwilioConfigResponseDto> {
    const encryptedAuthToken = this.encryptionService.encrypt(createTwilioConfigDto.authToken);
    const encryptedApiKeySecret = this.encryptionService.encrypt(createTwilioConfigDto.apiKeySecret);
    const newConfig = this.twilioConfigRepository.create({
      ...createTwilioConfigDto,
      organizationId,
      authToken: encryptedAuthToken,
      apiKeySecret: encryptedApiKeySecret,
    });
    const savedConfig = await this.twilioConfigRepository.save(newConfig);
    return new TwilioConfigResponseDto(savedConfig);
  }

  async findOne(organizationId: string, sanitize = false): Promise<TwilioConfig | TwilioConfigResponseDto> {
    const config = await this.twilioConfigRepository.findOne({ where: { organizationId } });
    if (!config) {
      throw new NotFoundException(`Twilio configuration for organization ${organizationId} not found`);
    }

    if (sanitize) {
      return new TwilioConfigResponseDto(config);
    }

    // Decrypt the tokens for internal use
    config.authToken = this.encryptionService.decrypt(config.authToken);
    config.apiKeySecret = this.encryptionService.decrypt(config.apiKeySecret);
    return config;
  }

  async update(
    organizationId: string,
    updateTwilioConfigDto: UpdateTwilioConfigDto,
  ): Promise<TwilioConfigResponseDto> {
    const config = await this.twilioConfigRepository.findOne({ where: { organizationId } });
    if (!config) {
      throw new NotFoundException(`Twilio configuration for organization ${organizationId} not found`);
    }

    if (updateTwilioConfigDto.authToken) {
      updateTwilioConfigDto.authToken = this.encryptionService.encrypt(updateTwilioConfigDto.authToken);
    }
    if (updateTwilioConfigDto.apiKeySecret) {
      updateTwilioConfigDto.apiKeySecret = this.encryptionService.encrypt(updateTwilioConfigDto.apiKeySecret);
    }

    Object.assign(config, updateTwilioConfigDto);
    const updatedConfig = await this.twilioConfigRepository.save(config);
    return new TwilioConfigResponseDto(updatedConfig);
  }

  async remove(organizationId: string): Promise<void> {
    const result = await this.twilioConfigRepository.delete({ organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Twilio configuration for organization ${organizationId} not found`);
    }
  }

  async findByAccountSid(accountSid: string): Promise<TwilioConfig> {
    const config = await this.twilioConfigRepository.findOne({ where: { accountSid } });
    if (!config) {
      throw new NotFoundException(`Twilio configuration for AccountSid ${accountSid} not found`);
    }

    // Decrypt the tokens for internal use
    config.authToken = this.encryptionService.decrypt(config.authToken);
    config.apiKeySecret = this.encryptionService.decrypt(config.apiKeySecret);
    return config;
  }
}