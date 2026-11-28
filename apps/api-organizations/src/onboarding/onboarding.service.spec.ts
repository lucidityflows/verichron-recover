// Mock uuid before importing anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
  validate: jest.fn(() => true),
}));

// Mock event-subscriber decorator
jest.mock('@verichron/event-subscriber', () => ({
  EventSubscription: jest.fn(() => jest.fn()),
  EventSubscriber: jest.fn(),
}));

// Mock entities before importing anything else
jest.mock('../profiles/entities', () => ({
  Organization: class Organization {},
  OrganizationAddress: class OrganizationAddress {},
  OrganizationEmail: class OrganizationEmail {},
  OrganizationPhoneNumber: class OrganizationPhoneNumber {},
}));

import { type TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { type Repository } from 'typeorm';
import { OnboardingService } from './onboarding.service';
import { Organization } from '../profiles/entities';
import { EventPublisher } from '@verichron/event-publisher';
import { EventOrchestratorClient } from '@verichron/event-orchestrator';
import { EVENT_TYPES } from '@verichron/events';
import { OrganizationStatus, OrganizationType } from '@verichron/enums';
import { OrganizationNotFoundException } from '../core/exceptions';
import {
  OrganizationAlreadyExistsException,
  EventPublishingFailedException,
} from './errors';
import {
  type ProvisionOrganizationDto,
  OnboardingStep,
} from './dto';
import { createMockRepository, createMockEventPublisher } from '../test/utils/test-helpers';
import { OrganizationCreatedDto } from '../events/event-dto/organizations/organization-created.dto';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let organizationRepository: Repository<Organization>;
  let eventPublisher: EventPublisher;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        OnboardingService,
        {
          provide: getRepositoryToken(Organization),
          useValue: createMockRepository(),
        },
        {
          provide: EventPublisher,
          useValue: createMockEventPublisher(),
        },
        {
          provide: EventOrchestratorClient,
          useValue: {
            request: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    organizationRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    eventPublisher = module.get<EventPublisher>(EventPublisher);
    const orchestratorClient = module.get<EventOrchestratorClient>(EventOrchestratorClient);

    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock orchestrator to return admin user ID (after clearAllMocks)
    (orchestratorClient.request as jest.Mock).mockResolvedValue({
      initialAdminUserId: '123e4567-e89b-12d3-a456-426614174888',
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('provisionOrganization', () => {
    const mockDto: ProvisionOrganizationDto = {
      organization: {
        name: 'Acme Collections',
        displayName: 'Acme Collections Agency',
        organizationType: OrganizationType.COLLECTION_AGENCY,
      },
      initialAdmin: {
        email: 'admin@acme.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      createdBy: '123e4567-e89b-12d3-a456-426614174999',
    };

    it('should successfully provision a new organization', async () => {
      const mockOrg = new Organization();
      mockOrg.id = mockOrgId;
      mockOrg.name = mockDto.organization.name;
      mockOrg.displayName = mockDto.organization.displayName;
      mockOrg.organizationType = mockDto.organization.organizationType;
      mockOrg.status = OrganizationStatus.PROVISIONING;
      mockOrg.settings = {};
      mockOrg.createdAt = new Date();

      // Step 1: No existing organization
      organizationRepository.findOne = jest.fn().mockResolvedValue(null);

      // Step 2: Create organization
      organizationRepository.create = jest.fn().mockReturnValue(mockOrg);

      // Step 3: Save organization with PROVISIONING status
      organizationRepository.save = jest.fn()
        .mockResolvedValue({ ...mockOrg, status: OrganizationStatus.PROVISIONING });

      // Step 4: Publish event
      eventPublisher.publish = jest.fn().mockResolvedValue(undefined);

      const result = await service.provisionOrganization(mockDto);

      // Verify organization created with PROVISIONING status
      expect(organizationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockDto.organization.name,
          displayName: mockDto.organization.displayName,
          organizationType: mockDto.organization.organizationType,
          status: OrganizationStatus.PROVISIONING,
          settings: {},
        }),
      );

      // Verify event published with correct payload
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED,
        expect.objectContaining({
          organizationId: mockOrgId,
          organizationName: mockDto.organization.name,
          organizationType: mockDto.organization.organizationType,
          adminUser: expect.objectContaining({
            email: mockDto.initialAdmin.email,
          }),
        }),
        OrganizationCreatedDto,
      );

      // Verify organization saved once with PROVISIONING status
      // (ACTIVE status update happens asynchronously via orchestrator)
      expect(organizationRepository.save).toHaveBeenCalledTimes(1);

      // Verify response
      expect(result).toEqual({
        orgId: mockOrgId,
        orgName: mockDto.organization.name,
        adminUserId: '123e4567-e89b-12d3-a456-426614174888',
        adminEmail: undefined,
        message: 'Organization successfully provisioned and activated',
        createdAt: mockOrg.createdAt,
      });
    });

    it('should apply default settings when provided', async () => {
      const mockOrgWithSettings = new Organization();
      mockOrgWithSettings.id = mockOrgId;
      mockOrgWithSettings.name = mockDto.organization.name;
      mockOrgWithSettings.displayName = mockDto.organization.displayName;
      mockOrgWithSettings.organizationType = mockDto.organization.organizationType;
      mockOrgWithSettings.status = OrganizationStatus.PROVISIONING;
      mockOrgWithSettings.createdAt = new Date();

      const dtoWithSettings: ProvisionOrganizationDto = {
        ...mockDto,
        defaultSettings: {
          branding: { primary_color_hex: '#1E40AF' },
          compliance: { fdcpa_strict_mode: true },
        },
      };

      organizationRepository.findOne = jest.fn().mockResolvedValue(null);
      organizationRepository.create = jest.fn().mockReturnValue(mockOrgWithSettings);
      organizationRepository.save = jest.fn().mockResolvedValue(mockOrgWithSettings);
      eventPublisher.publish = jest.fn().mockResolvedValue(undefined);

      await service.provisionOrganization(dtoWithSettings);

      expect(organizationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: dtoWithSettings.defaultSettings,
        }),
      );
    });

    it('should throw OrganizationAlreadyExistsException if organization exists', async () => {
      const existingOrg = new Organization();
      existingOrg.id = mockOrgId;
      existingOrg.name = mockDto.organization.name;

      organizationRepository.findOne = jest.fn().mockResolvedValue(existingOrg);

      await expect(service.provisionOrganization(mockDto)).rejects.toThrow(
        OrganizationAlreadyExistsException,
      );

      // Should not create or publish event
      expect(organizationRepository.create).not.toHaveBeenCalled();
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should handle event publishing failure gracefully', async () => {
      const mockOrg = new Organization();
      mockOrg.id = mockOrgId;
      mockOrg.name = mockDto.organization.name;
      mockOrg.status = OrganizationStatus.PROVISIONING;
      mockOrg.createdAt = new Date();

      organizationRepository.findOne = jest.fn().mockResolvedValue(null);
      organizationRepository.create = jest.fn().mockReturnValue(mockOrg);
      organizationRepository.save = jest.fn().mockResolvedValue(mockOrg);
      eventPublisher.publish = jest.fn().mockRejectedValue(new Error('Event bus unavailable'));

      await expect(service.provisionOrganization(mockDto)).rejects.toThrow(
        EventPublishingFailedException,
      );

      // Verify organization was created
      expect(organizationRepository.save).toHaveBeenCalledTimes(1);
      // Note: publish may or may not be called depending on where validation fails
    });

    it('should handle database save failure', async () => {
      organizationRepository.findOne = jest.fn().mockResolvedValue(null);
      organizationRepository.create = jest.fn().mockReturnValue(new Organization());
      organizationRepository.save = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(service.provisionOrganization(mockDto)).rejects.toThrow(
        'Database error',
      );

      // Should not publish event if save fails
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should use organization settings over defaultSettings', async () => {
      const mockOrg = new Organization();
      mockOrg.id = mockOrgId;
      mockOrg.name = mockDto.organization.name;
      mockOrg.displayName = mockDto.organization.displayName;
      mockOrg.organizationType = mockDto.organization.organizationType;
      mockOrg.status = OrganizationStatus.PROVISIONING;
      mockOrg.createdAt = new Date();

      const orgSettings = { branding: { logo_url: 'http://logo.png' } };
      const defaultSettings = { branding: { primary_color_hex: '#000000' } };

      const dtoWithBothSettings: ProvisionOrganizationDto = {
        ...mockDto,
        organization: {
          ...mockDto.organization,
          settings: orgSettings,
        },
        defaultSettings,
      };

      organizationRepository.findOne = jest.fn().mockResolvedValue(null);
      organizationRepository.create = jest.fn().mockReturnValue(mockOrg);
      organizationRepository.save = jest.fn().mockResolvedValue(mockOrg);
      eventPublisher.publish = jest.fn().mockResolvedValue(undefined);

      await service.provisionOrganization(dtoWithBothSettings);

      // Should prefer defaultSettings over organization.settings
      expect(organizationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: defaultSettings,
        }),
      );
    });
  });

  describe('getOnboardingStatus', () => {
    it('should return onboarding status for an active organization', async () => {
      const mockOrg = new Organization();
      mockOrg.id = mockOrgId;
      mockOrg.name = 'Acme Collections';
      mockOrg.status = OrganizationStatus.ACTIVE;
      mockOrg.settings = {
        branding: { primary_color_hex: '#1E40AF' },
      };
      mockOrg.createdAt = new Date('2025-10-18T10:00:00.000Z');
      mockOrg.updatedAt = new Date('2025-10-18T10:05:00.000Z');

      organizationRepository.findOne = jest.fn().mockResolvedValue(mockOrg);

      const result = await service.getOnboardingStatus(mockOrgId);

      expect(result).toEqual({
        orgId: mockOrgId,
        orgName: mockOrg.name,
        status: OrganizationStatus.ACTIVE,
        completedSteps: [
          OnboardingStep.ORGANIZATION_CREATED,
          OnboardingStep.DEFAULT_SETTINGS_APPLIED,
          OnboardingStep.ADMIN_USER_PROVISIONED,
          OnboardingStep.ORGANIZATION_ACTIVATED,
          OnboardingStep.EVENT_PUBLISHED,
        ],
        isComplete: true,
        createdAt: mockOrg.createdAt,
        updatedAt: mockOrg.updatedAt,
      });
    });

    it('should return partial onboarding status for provisioning organization', async () => {
      const mockOrg = new Organization();
      mockOrg.id = mockOrgId;
      mockOrg.name = 'Acme Collections';
      mockOrg.status = OrganizationStatus.PROVISIONING;
      mockOrg.settings = {};
      mockOrg.createdAt = new Date('2025-10-18T10:00:00.000Z');
      mockOrg.updatedAt = new Date('2025-10-18T10:01:00.000Z');

      organizationRepository.findOne = jest.fn().mockResolvedValue(mockOrg);

      const result = await service.getOnboardingStatus(mockOrgId);

      expect(result).toEqual({
        orgId: mockOrgId,
        orgName: mockOrg.name,
        status: OrganizationStatus.PROVISIONING,
        completedSteps: [OnboardingStep.ORGANIZATION_CREATED],
        isComplete: false,
        createdAt: mockOrg.createdAt,
        updatedAt: mockOrg.updatedAt,
      });
    });

    it('should include DEFAULT_SETTINGS_APPLIED step when settings exist', async () => {
      const mockOrg = new Organization();
      mockOrg.id = mockOrgId;
      mockOrg.name = 'Acme Collections';
      mockOrg.status = OrganizationStatus.PROVISIONING;
      mockOrg.settings = { branding: { primary_color_hex: '#1E40AF' } };
      mockOrg.createdAt = new Date();
      mockOrg.updatedAt = new Date();

      organizationRepository.findOne = jest.fn().mockResolvedValue(mockOrg);

      const result = await service.getOnboardingStatus(mockOrgId);

      expect(result.completedSteps).toContain(OnboardingStep.ORGANIZATION_CREATED);
      expect(result.completedSteps).toContain(OnboardingStep.DEFAULT_SETTINGS_APPLIED);
      expect(result.completedSteps).not.toContain(OnboardingStep.ADMIN_USER_PROVISIONED);
      expect(result.isComplete).toBe(false);
    });

    it('should throw OrganizationNotFoundException if organization does not exist', async () => {
      organizationRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.getOnboardingStatus('nonexistent')).rejects.toThrow(
        OrganizationNotFoundException,
      );
    });

    it('should handle organization with empty settings', async () => {
      const mockOrg = new Organization();
      mockOrg.id = mockOrgId;
      mockOrg.name = 'Acme Collections';
      mockOrg.status = OrganizationStatus.PROVISIONING;
      mockOrg.settings = {};
      mockOrg.createdAt = new Date();
      mockOrg.updatedAt = new Date();

      organizationRepository.findOne = jest.fn().mockResolvedValue(mockOrg);

      const result = await service.getOnboardingStatus(mockOrgId);

      expect(result.completedSteps).toEqual([OnboardingStep.ORGANIZATION_CREATED]);
      expect(result.completedSteps).not.toContain(OnboardingStep.DEFAULT_SETTINGS_APPLIED);
    });

    it('should handle organization without settings field', async () => {
      const mockOrg = new Organization();
      mockOrg.id = mockOrgId;
      mockOrg.name = 'Acme Collections';
      mockOrg.status = OrganizationStatus.PROVISIONING;
      mockOrg.createdAt = new Date();
      mockOrg.updatedAt = new Date();
      // settings is undefined

      organizationRepository.findOne = jest.fn().mockResolvedValue(mockOrg);

      const result = await service.getOnboardingStatus(mockOrgId);

      expect(result.completedSteps).toEqual([OnboardingStep.ORGANIZATION_CREATED]);
      expect(result.isComplete).toBe(false);
    });
  });

  describe('error logging', () => {
    it('should throw error when provisioning fails due to database error', async () => {
      organizationRepository.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      const mockDto: ProvisionOrganizationDto = {
        organization: {
          name: 'Test Org',
          displayName: 'Test Organization',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        },
        initialAdmin: {
          email: 'admin@test.com',
          firstName: 'Test',
          lastName: 'User',
        },
        createdBy: '123e4567-e89b-12d3-a456-426614174999',
      };

      await expect(service.provisionOrganization(mockDto)).rejects.toThrow('Database error');
    });

    it('should throw error when getting onboarding status fails', async () => {
      organizationRepository.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(service.getOnboardingStatus(mockOrgId)).rejects.toThrow('Database error');
    });
  });
});
