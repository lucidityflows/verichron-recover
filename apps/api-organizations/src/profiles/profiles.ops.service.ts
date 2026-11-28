import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Organization,
  OrganizationAddress,
  OrganizationEmail,
  OrganizationPhoneNumber,
} from './entities';
import {
  OrganizationNotFoundException,
  OrganizationAlreadyExistsException,
} from '../core/exceptions';
import {
  validatePaginationOptions,
  executePaginatedQuery,
  applySorting,
  applyPartialMatch,
  applyEnumFilter,
  applySearchFilter,
  applyExactMatch,
} from '../core/utils';
import { PaginatedResponseDto } from '../core/dto';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationQueryDto
} from './dto';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { OrganizationStatus } from '@verichron/enums';
import {
  OrganizationUpdatedDto,
  OrganizationNameChangedDto,
  OrganizationStatusUpdatedDto,
} from '../events/event-dto/organizations';
import { IActorSnapshot } from '@verichron/contracts';

/**
 * Ops Service for Organization Management
 *
 * Exclusively for Platform Admins (ui-ops).
 * Bypasses all organization context checks.
 * STRICTLY SEPARATED from tenant business logic.
 */
@Injectable()
export class ProfilesOpsService {
  private readonly logger = new Logger(ProfilesOpsService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationAddress)
    private readonly addressRepository: Repository<OrganizationAddress>,
    @InjectRepository(OrganizationEmail)
    private readonly emailRepository: Repository<OrganizationEmail>,
    @InjectRepository(OrganizationPhoneNumber)
    private readonly phoneNumberRepository: Repository<OrganizationPhoneNumber>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Create a new organization (System Level)
   */
  async createOrganization(
    dto: CreateOrganizationDto,
    actor: IActorSnapshot,
  ): Promise<OrganizationResponseDto> {
    const existing = await this.organizationRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new OrganizationAlreadyExistsException(dto.name);
    }

    const organization = this.organizationRepository.create({
      name: dto.name,
      displayName: dto.displayName,
      organizationType: dto.organizationType,
      parentOrganizationId: dto.parentOrganizationId,
      taxId: dto.taxId,
      settings: dto.settings,
      status: OrganizationStatus.PROVISIONING,
    });

    const saved = await this.organizationRepository.save(organization);
    this.logger.log(`[Ops] Created organization with ID: ${saved.id} by admin: ${actor.id}`);

    return this.mapOrganizationToResponse(saved);
  }

  /**
   * List all organizations system-wide
   */
  async findAllOrganizations(
    query: OrganizationQueryDto,
  ): Promise<PaginatedResponseDto<OrganizationResponseDto>> {
    const paginationOptions = validatePaginationOptions(
      query.page,
      query.pageSize,
    );

    const qb = this.organizationRepository.createQueryBuilder('org');

    if (query.search) {
      applySearchFilter(qb, 'org', ['name', 'displayName'], query.search, 'search');
    }

    applyPartialMatch(qb, 'org', 'name', query.name, 'name');
    applyEnumFilter(qb, 'org', 'organizationType', query.organizationType, 'organizationType');
    applyEnumFilter(qb, 'org', 'status', query.status, 'status');
    applyExactMatch(qb, 'org', 'parentOrganizationId', query.parentOrganizationId, 'parentOrganizationId');

    if (query.topLevelOnly) {
      qb.andWhere('org.parentOrganizationId IS NULL');
    }

    const allowedSortFields = ['name', 'displayName', 'organizationType', 'status', 'createdAt', 'updatedAt'];
    applySorting(qb, 'org', query.sortBy, query.sortOrder, allowedSortFields);

    const result = await executePaginatedQuery(qb, paginationOptions);
    return {
      ...result,
      data: result.data.map((org) => this.mapOrganizationToResponse(org)),
    };
  }

  /**
   * Get organization details by ID
   */
  async findOneOrganization(orgId: string): Promise<OrganizationResponseDto> {
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new OrganizationNotFoundException(orgId);
    }

    return this.mapOrganizationToResponse(organization);
  }

  /**
   * Update organization (Admin Override)
   */
  async updateOrganization(
    orgId: string,
    dto: UpdateOrganizationDto,
    actor: IActorSnapshot,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new OrganizationNotFoundException(orgId);
    }

    const updatedFields: string[] = [];
    const oldName = organization.name;
    const oldStatus = organization.status;

    if (dto.name !== undefined && dto.name !== organization.name) {
      organization.name = dto.name;
      updatedFields.push('name');
    }
    if (dto.displayName !== undefined && dto.displayName !== organization.displayName) {
      organization.displayName = dto.displayName;
      updatedFields.push('displayName');
    }
    if (dto.organizationType !== undefined && dto.organizationType !== organization.organizationType) {
      organization.organizationType = dto.organizationType;
      updatedFields.push('organizationType');
    }
    if (dto.parentOrganizationId !== undefined && dto.parentOrganizationId !== organization.parentOrganizationId) {
      organization.parentOrganizationId = dto.parentOrganizationId;
      updatedFields.push('parentOrganizationId');
    }
    if (dto.taxId !== undefined && dto.taxId !== organization.taxId) {
      organization.taxId = dto.taxId;
      updatedFields.push('taxId');
    }
    if (dto.status !== undefined && dto.status !== organization.status) {
      organization.status = dto.status;
      updatedFields.push('status');
    }
    if (dto.settings !== undefined && JSON.stringify(dto.settings) !== JSON.stringify(organization.settings)) {
      organization.settings = dto.settings;
      updatedFields.push('settings');
    }

    const updated = await this.organizationRepository.save(organization);
    this.logger.log(`[Ops] Updated organization ${orgId} by admin: ${actor.id}`);

    if (updatedFields.length > 0) {
      await this.eventPublisher.publish(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_UPDATED,
        {
          organizationId: orgId,
          updatedFields,
          updatedAt: updated.updatedAt.toISOString(),
          updatedBy: actor.id,
        },
        OrganizationUpdatedDto,
      );

      if (updatedFields.includes('name')) {
        await this.eventPublisher.publish(
          EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_NAME_CHANGED,
          {
            organizationId: orgId,
            previousName: oldName,
            newName: updated.name,
            changedAt: new Date().toISOString(),
            updatedBy: actor.id,
          },
          OrganizationNameChangedDto,
        );
      }

      if (updatedFields.includes('status')) {
        await this.eventPublisher.publish(
          EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_STATUS_CHANGED,
          {
            organizationId: orgId,
            previousStatus: oldStatus,
            newStatus: updated.status,
            reason: 'Platform Admin Update',
            updatedBy: actor.id,
            actor: {
              id: actor.id,
              name: actor.name,
              email: actor.email,
              role: actor.role,
            },
            statusChangedAt: new Date().toISOString(),
          },
          OrganizationStatusUpdatedDto,
        );
      }
    }

    return this.mapOrganizationToResponse(updated);
  }

  /**
   * Force Suspend/Activate organization
   */
  async updateStatus(
    orgId: string,
    status: OrganizationStatus,
    actor: IActorSnapshot,
  ): Promise<OrganizationResponseDto> {
    return this.updateOrganization(orgId, { status }, actor);
  }

  /**
   * Soft Delete Organization
   */
  async deleteOrganization(orgId: string, actor: IActorSnapshot): Promise<void> {
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new OrganizationNotFoundException(orgId);
    }

    const previousStatus = organization.status;
    organization.status = OrganizationStatus.INACTIVE;
    await this.organizationRepository.save(organization);
    
    // Publish event for deletion
    await this.eventPublisher.publish(
      EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_STATUS_CHANGED,
      {
        organizationId: orgId,
        previousStatus, // previous status was whatever it was before save
        newStatus: OrganizationStatus.INACTIVE,
        reason: 'Platform Admin Deletion',
        updatedBy: actor.id,
        actor: {
          id: actor.id,
          name: actor.name,
          email: actor.email,
          role: actor.role,
        },
        statusChangedAt: new Date().toISOString(),
      },
      OrganizationStatusUpdatedDto,
    );

    this.logger.log(`[Ops] Soft deleted organization ${orgId} by admin: ${actor.id}`);
  }

  // ==================== MAPPERS ====================

  private mapOrganizationToResponse(org: Organization): OrganizationResponseDto {
    return {
      id: org.id,
      name: org.name,
      displayName: org.displayName,
      organizationType: org.organizationType,
      parentOrganizationId: org.parentOrganizationId,
      taxId: org.taxId,
      status: org.status,
      settings: org.settings,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }
}
