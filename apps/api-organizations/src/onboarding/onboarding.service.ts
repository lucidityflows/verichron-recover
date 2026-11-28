import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../profiles/entities';
import { OrganizationNotFoundException } from '../core/exceptions';
import {
  ProvisionOrganizationDto,
  OnboardingResponseDto,
  OnboardingStatusResponseDto,
  OnboardingStep,
} from './dto';
import { OrganizationAlreadyExistsException, EventPublishingFailedException } from './errors';
import {
  EventOrchestratorClient,
  OrganizationOnboardingRequestedDto,
  OrganizationOnboardingCompletedDto,
} from '@verichron/event-orchestrator';
import { EventPublisher } from '@verichron/event-publisher';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
} from '@verichron/events';
import {
  OrganizationStatus
} from '@verichron/enums';
import {
  OrganizationCreatedDto,
  OrganizationStatusUpdatedDto,
} from '../events/event-dto/organizations';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly orchestratorClient: EventOrchestratorClient,
    private readonly eventPublisher: EventPublisher, // Re-injected for activation event
  ) {}

  async provisionOrganization(
    dto: ProvisionOrganizationDto,
  ): Promise<OnboardingResponseDto> {
    const existing = await this.organizationRepository.findOne({
      where: { name: dto.organization.name },
    });
    if (existing) {
      throw new OrganizationAlreadyExistsException(dto.organization.name);
    }

    const organization = this.organizationRepository.create({
      name: dto.organization.name,
      displayName: dto.organization.displayName,
      organizationType: dto.organization.organizationType,
      parentOrganizationId: dto.organization.parentOrganizationId,
      taxId: dto.organization.taxId,
      status: OrganizationStatus.PROVISIONING,
      settings: dto.defaultSettings || dto.organization.settings || {}
    });
    const savedOrg = await this.organizationRepository.save(organization);
    this.logger.log(
      `Created organization ${savedOrg.id} with PROVISIONING status.`
    );

    // Publish OrganizationCreated event immediately after creation
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED,
        {
          organizationId: savedOrg.id,
          organizationName: savedOrg.name,
          organizationType: savedOrg.organizationType,
          adminUser: {
            email: dto.initialAdmin.email,
            firstName: dto.initialAdmin.firstName,
            lastName: dto.initialAdmin.lastName,
          },
          createdBy: dto.createdBy,
          createdAt: savedOrg.createdAt.toISOString(),
        },
        OrganizationCreatedDto,
      );
    } catch (error) {
      this.logger.error(`Failed to publish OrganizationCreated event for org ${savedOrg.id}`, error);
      // Optional: Delete the organization if event publishing fails to maintain consistency
      // await this.organizationRepository.delete(savedOrg.id);
      throw new EventPublishingFailedException(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
    this.logger.log(`Published OrganizationCreated event for org: ${savedOrg.id}`);

    // Await orchestration completion
    let orchestrationResult: OrganizationOnboardingCompletedDto;
    try {
      orchestrationResult = await this.orchestratorClient.request<OrganizationOnboardingCompletedDto, OrganizationOnboardingRequestedDto>(
        EVENT_TOPICS.ORGANIZATIONS,
        EVENT_TYPES.ORGANIZATIONS_ONBOARDING_REQUESTED,
        {
          organizationId: savedOrg.id,
          organizationName: savedOrg.name,
          organizationType: savedOrg.organizationType,
          adminUser: {
            email: dto.initialAdmin.email,
            firstName: dto.initialAdmin.firstName,
            lastName: dto.initialAdmin.lastName,
          },
          createdBy: dto.createdBy,
        },
        OrganizationOnboardingRequestedDto,
        85000, // Increased timeout to 85 seconds
      );

      this.logger.log(
        `Onboarding orchestration completed for org ${savedOrg.id}. Admin user: ${orchestrationResult.initialAdminUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Onboarding orchestration failed for org ${savedOrg.id}. Initiating rollback/cleanup.`,
        error,
      );
      await this.organizationRepository.update(savedOrg.id, { status: OrganizationStatus.FAILED });
      throw error; // Re-throw to inform caller of failure
    }

    return {
      orgId: savedOrg.id,
      orgName: savedOrg.name,
      adminUserId: orchestrationResult.initialAdminUserId,
      adminEmail: orchestrationResult.initialAdminEmail,
      message: 'Organization successfully provisioned and activated',
      createdAt: savedOrg.createdAt,
    };
  }

  async activateOrganization(orgId: string, updatedBy: string, reason: string, actorEmail: string, actorName: string): Promise<void> {
    this.logger.log(`Activating organization: ${orgId}`);

    const organization = await this.organizationRepository.findOne({ where: { id: orgId } });
    if (!organization) {
      throw new OrganizationNotFoundException(orgId);
    }

    if (organization.status === OrganizationStatus.PROVISIONING) {
      const previousStatus = organization.status;
      organization.status = OrganizationStatus.ACTIVE;
      await this.organizationRepository.save(organization);

      await this.eventPublisher.publish(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_STATUS_CHANGED,
        {
          organizationId: orgId,
          previousStatus,
          newStatus: organization.status,
          reason,
          updatedBy,
          actor: {
            id: updatedBy,
            name: actorName,
            email: actorEmail,
            role: 'ORG_ADMIN',
          },
          statusChangedAt: new Date().toISOString(),
        },
        OrganizationStatusUpdatedDto,
      );

      this.logger.log(`Organization ${orgId} has been activated.`);
    } else {
      this.logger.warn(
        `Organization ${orgId} is not in PROVISIONING status, skipping activation. Current status: ${organization.status}`,
      );
    }
  }

  async getOnboardingStatus(
    orgId: string,
  ): Promise<OnboardingStatusResponseDto> {
    const organization = await this.organizationRepository.findOne({ where: { id: orgId } });
    if (!organization) {
      throw new OrganizationNotFoundException(orgId);
    }

    const completedSteps: OnboardingStep[] = [];
    if (organization.id) {
      completedSteps.push(OnboardingStep.ORGANIZATION_CREATED);
    }
    if (organization.settings && Object.keys(organization.settings).length > 0) {
      completedSteps.push(OnboardingStep.DEFAULT_SETTINGS_APPLIED);
    }
    if (organization.status === OrganizationStatus.ACTIVE) {
      completedSteps.push(
        OnboardingStep.ADMIN_USER_PROVISIONED,
        OnboardingStep.ORGANIZATION_ACTIVATED,
        OnboardingStep.EVENT_PUBLISHED,
      );
    }

    return {
      orgId: organization.id,
      orgName: organization.name,
      status: organization.status,
      completedSteps,
      isComplete: organization.status === OrganizationStatus.ACTIVE,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}