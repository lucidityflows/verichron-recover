import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, OrchestrationEventEnvelope } from '@verichron/events';
import {
  OrganizationOnboardingRequestedDto,
  OrganizationOnboardingCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';

/**
 * ========================================================================
 * Organization Onboarding Orchestrator
 * ========================================================================
 *
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class OnboardingOrchestrator extends BaseOrchestrator<
  OrganizationOnboardingRequestedDto,
  OrganizationOnboardingCompletedDto
> {
  protected readonly logger = new Logger(OnboardingOrchestrator.name);
  protected readonly requestDtoClass = OrganizationOnboardingRequestedDto;
  protected readonly responseDtoClass = OrganizationOnboardingCompletedDto;
  protected readonly serviceName = 'api-organizations';
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ORGANIZATIONS';

  constructor(
    @Inject('EVENT_ORCHESTRATOR_CONFIG')
    config: EventOrchestratorConfig,
    httpService: HttpService,
    eventPublisher: EventPublisher,
  ) {
    super(config, httpService, eventPublisher);
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    subscriptionName: 'orchestrator-onboarding-requested-sub',
    eventType: EVENT_TYPES.ORGANIZATIONS_ONBOARDING_REQUESTED,
    dto: OrganizationOnboardingRequestedDto,
  })
  async handleOnboardingRequested(envelope: OrchestrationEventEnvelope<OrganizationOnboardingRequestedDto>) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ORGANIZATIONS_ONBOARDING_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: OrganizationOnboardingRequestedDto,
  ): Promise<OrganizationOnboardingCompletedDto> {
    const { organizationId, organizationName, adminUser } = payload;

    // Step 1: Create initial admin user via api-users
    const createdUser = await this.createInitialAdminUser(
      organizationId,
      organizationName,
      adminUser.email,
      adminUser.firstName,
      adminUser.lastName,
    );
    this.logger.log(`Step 1/3: Created initial admin user: ${createdUser.id}`);

    // Step 2: Set up default settings
    await this.setupDefaultSettings(organizationId);
    this.logger.log(`Step 2/3: Set up default settings`);

    // Step 3: Activate the organization
    const actorName = `${adminUser.firstName} ${adminUser.lastName}`;
    await this.activateOrganization(organizationId, createdUser.id, createdUser.email, actorName);
    this.logger.log(`Step 3/3: Activated organization`);

    return {
      organizationId,
      organizationName,
      initialAdminUserId: createdUser.id,
      initialAdminEmail: createdUser.email,
      onboardedAt: new Date().toISOString(),
    };
  }

  private async createInitialAdminUser(
    organizationId: string,
    organizationName: string,
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<{ id: string; email: string }> {
    const apiUsersUrl = this.config.serviceEndpoints['api-users'];
    if (!apiUsersUrl) throw new Error('api-users service endpoint not configured');

    return this.fetchInternal(
      apiUsersUrl,
      '/internal/users/provision-initial-admin',
      'POST',
      { organizationId, organizationName, email, firstName, lastName }
    );
  }

  private async setupDefaultSettings(organizationId: string): Promise<void> {
    // Future placeholder
  }

  private async activateOrganization(
    organizationId: string, 
    adminUserId: string,
    actorEmail: string,
    actorName: string
  ): Promise<void> {
    const apiOrgsUrl = this.config.serviceEndpoints['api-organizations'];
    if (!apiOrgsUrl) throw new Error('api-organizations service endpoint not configured');

    await this.fetchInternal(
      apiOrgsUrl,
      '/internal/activate-organization',
      'POST',
      { 
        organizationId, 
        updatedBy: adminUserId, 
        reason: 'Initial admin user provisioned.',
        actorEmail,
        actorName
      }
    );
  }
}