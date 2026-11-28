import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../profiles/entities';
import { OrganizationNotFoundException } from '../core/exceptions';
import {
  OrganizationSettingsResponseDto,
  UpdateOrganizationSettingsDto,
} from './dto';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { OrganizationSettingsUpdatedDto } from '../events/event-dto/organizations';

/**
 * Ops Service for Organization Settings
 *
 * Exclusively for Platform Admins (ui-ops).
 * Bypasses tenant-scoped security.
 */
@Injectable()
export class SettingsOpsService {
  private readonly logger = new Logger(SettingsOpsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Get settings for an organization (unscoped)
   */
  async getSettings(orgId: string): Promise<OrganizationSettingsResponseDto> {
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
  }

  /**
   * Update settings for an organization (Admin Override)
   */
  async updateSettings(
    orgId: string,
    dto: UpdateOrganizationSettingsDto,
    adminId: string,
  ): Promise<OrganizationSettingsResponseDto> {
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new OrganizationNotFoundException(orgId);
    }

    const existingSettings = organization.settings || {};
    // Deep merge settings (reusing the logic conceptually)
    const updatedSettings = { ...existingSettings, ...dto.settings };

    organization.settings = updatedSettings;
    organization.updatedBy = adminId;
    const saved = await this.organizationRepository.save(organization);

    // Publish event
    await this.eventPublisher.publish(
      EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SETTINGS_UPDATED,
      {
        organizationId: orgId,
        updatedSettingKeys: Object.keys(dto.settings),
        updatedBy: adminId,
      },
      OrganizationSettingsUpdatedDto,
    );

    return {
      orgId: saved.id,
      settings: saved.settings || {},
      updatedAt: saved.updatedAt,
      updatedBy: saved.updatedBy || null,
    };
  }
}
