import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../profiles/entities';
import { OrganizationNotFoundException } from '../core/exceptions';
import {
  OrganizationSettingsResponseDto,
  UpdateOrganizationSettingsDto,
  ReplaceOrganizationSettingsDto,
  OrganizationSettingsDto,
} from './dto';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { OrganizationSettingsUpdatedDto } from '../events/event-dto/organizations';
import { EventPublishingFailedException } from '../onboarding/errors';
import { InvalidSettingsException } from './errors';

/**
 * Settings service handles organization-specific configuration (JSONB)
 * Validates settings and publishes OrganizationSettingsUpdated events
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async getSettings(orgId: string): Promise<OrganizationSettingsResponseDto> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: orgId },
        select: ['id', 'settings', 'updatedAt', 'updatedBy'],
      });

      if (!organization) {
        throw new OrganizationNotFoundException(orgId);
      }

      return {
        orgId: organization.id,
        settings: organization.settings || {},
        updatedAt: organization.updatedAt,
        updatedBy: organization.updatedBy || null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to get settings for ${orgId}: ${message}`,
        stack,
      );
      throw error;
    }
  }

  async updateSettings(
    orgId: string,
    dto: UpdateOrganizationSettingsDto,
    updatedBy: string,
  ): Promise<OrganizationSettingsResponseDto> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: orgId },
      });

      if (!organization) {
        throw new OrganizationNotFoundException(orgId);
      }

      // Merge new settings with existing settings (deep merge)
      const existingSettings = organization.settings || {};
      const updatedSettings = this.deepMerge(existingSettings, dto.settings);

      await this.validateSettings(updatedSettings);

      organization.settings = updatedSettings;
      organization.updatedBy = updatedBy;
      const saved = await this.organizationRepository.save(organization);

      // Create and publish event payload
      const settingsUpdatedDto = plainToInstance(OrganizationSettingsUpdatedDto, {
        organizationId: orgId,
        updatedSettingKeys: Object.keys(dto.settings),
        updatedBy: updatedBy,
      });

      const settingsErrors = await validate(settingsUpdatedDto);
      if (settingsErrors.length > 0) {
        this.logger.error('Failed to validate OrganizationSettingsUpdated payload', settingsErrors);
        throw new EventPublishingFailedException('OrganizationSettingsUpdated', 'Payload validation failed');
      }

      await this.eventPublisher.publish(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SETTINGS_UPDATED,
        settingsUpdatedDto,
        OrganizationSettingsUpdatedDto,
      );
      this.logger.log(
        `Published OrganizationSettingsUpdated event for ${orgId}`,
      );

      return {
        orgId: saved.id,
        settings: saved.settings || {},
        updatedAt: saved.updatedAt,
        updatedBy: saved.updatedBy || null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update settings for ${orgId}: ${message}`,
        stack,
      );
      throw error;
    }
  }

  async replaceSettings(
    orgId: string,
    dto: ReplaceOrganizationSettingsDto,
    updatedBy: string,
  ): Promise<OrganizationSettingsResponseDto> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: orgId },
      });

      if (!organization) {
        throw new OrganizationNotFoundException(orgId);
      }

      await this.validateSettings(dto.settings);

      // Completely replace settings
      organization.settings = dto.settings;
      organization.updatedBy = updatedBy;
      const saved = await this.organizationRepository.save(organization);

      this.logger.log(`Replaced all settings for organization ${orgId}`);

      // Create and publish event payload
      const settingsUpdatedDto = plainToInstance(OrganizationSettingsUpdatedDto, {
        organizationId: orgId,
        updatedSettingKeys: Object.keys(dto.settings),
        updatedBy: updatedBy,
      });

      const settingsErrors = await validate(settingsUpdatedDto);
      if (settingsErrors.length > 0) {
        this.logger.error('Failed to validate OrganizationSettingsUpdated payload', settingsErrors);
        throw new EventPublishingFailedException('OrganizationSettingsUpdated', 'Payload validation failed');
      }

      await this.eventPublisher.publish(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SETTINGS_UPDATED,
        settingsUpdatedDto,
        OrganizationSettingsUpdatedDto,
      );
      this.logger.log(
        `Published OrganizationSettingsUpdated event for ${orgId}`,
      );

      return {
        orgId: saved.id,
        settings: saved.settings || {},
        updatedAt: saved.updatedAt,
        updatedBy: saved.updatedBy || null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to replace settings for ${orgId}: ${message}`,
        stack,
      );
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Deep merge two objects
   * Arrays are replaced, not merged
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }

    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Validate settings structure and values
   */
  private async validateSettings(settings: Record<string, any>): Promise<void> {
    const settingsDto = plainToInstance(OrganizationSettingsDto, settings);
    const errors = await validate(settingsDto);

    if (errors.length > 0) {
      this.logger.warn('Settings validation failed', { errors });
      throw new InvalidSettingsException(errors);
    }
  }
}
