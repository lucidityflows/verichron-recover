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
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard, PermissionsGuard } from '@verichron/auth';
import { OrganizationStatus, OrganizationType } from '@verichron/enums';
import type { Request } from 'express';
import {
  type OnboardingResponseDto,
  type OnboardingStatusResponseDto,
  OnboardingStep,
} from './dto';

describe('OnboardingController', () => {
  let controller: OnboardingController;
  let service: OnboardingService;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const mockAdminUserId = '456e7890-e89b-12d3-a456-426614174111';
  const mockPlatformAdminId = '789e0123-e89b-12d3-a456-426614174222';

  const mockOnboardingService = {
    provisionOrganization: jest.fn(),
    getOnboardingStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      controllers: [OnboardingController],
      providers: [
        {
          provide: OnboardingService,
          useValue: mockOnboardingService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<OnboardingController>(OnboardingController);
    service = module.get<OnboardingService>(OnboardingService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==========================================================================
  // Provision Organization Tests
  // ==========================================================================

  describe('provisionOrganization', () => {
    it('should provision a new organization successfully', async () => {
      const provisionDto = {
        organization: {
          name: 'Acme Collection Agency',
          displayName: 'Acme Collections',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        },
        initialAdmin: {
          email: 'admin@acme-collections.com',
          firstName: 'John',
          lastName: 'Doe',
          password: 'SecureP@ssw0rd!',
        },
        defaultSettings: {
          branding: {
            logo_url: 'https://cdn.example.com/logo.png',
            primary_color_hex: '#1E40AF',
          },
        },
      };

      const mockRequest = {
        user: { sub: mockPlatformAdminId },
      } as unknown as Request;

      const mockResponse: OnboardingResponseDto = {
        orgId: mockOrgId,
        orgName: 'Acme Collection Agency',
        adminUserId: mockAdminUserId,
        adminEmail: 'admin@acme-collections.com',
        message: 'Organization successfully provisioned and activated',
        createdAt: new Date(),
      };

      mockOnboardingService.provisionOrganization.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.provisionOrganization(
        provisionDto,
        mockRequest,
      );

      expect(service.provisionOrganization).toHaveBeenCalledWith({
        ...provisionDto,
        createdBy: mockPlatformAdminId,
      });
      expect(service.provisionOrganization).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.orgId).toBe(mockOrgId);
      expect(result.adminUserId).toBe(mockAdminUserId);
    });

    it('should provision organization without default settings', async () => {
      const provisionDto = {
        organization: {
          name: 'Simple Agency',
          displayName: 'Simple Collections',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        },
        initialAdmin: {
          email: 'admin@simple.com',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      };

      const mockRequest = {
        user: { sub: mockPlatformAdminId },
      } as unknown as Request;

      const mockResponse: OnboardingResponseDto = {
        orgId: mockOrgId,
        orgName: 'Simple Agency',
        adminUserId: mockAdminUserId,
        adminEmail: 'admin@simple.com',
        message: 'Organization successfully provisioned and activated',
        createdAt: new Date(),
      };

      mockOnboardingService.provisionOrganization.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.provisionOrganization(
        provisionDto,
        mockRequest,
      );

      expect(service.provisionOrganization).toHaveBeenCalledWith({
        ...provisionDto,
        createdBy: mockPlatformAdminId,
      });
      expect(service.provisionOrganization).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should handle different organization types', async () => {
      const provisionDto = {
        organization: {
          name: 'Creditor Corp',
          displayName: 'Creditor Corporation',
          organizationType: OrganizationType.CREDITOR,
        },
        initialAdmin: {
          email: 'admin@creditor-corp.com',
          firstName: 'Bob',
          lastName: 'Johnson',
        },
      };

      const mockRequest = {
        user: { sub: mockPlatformAdminId },
      } as unknown as Request;

      const mockResponse: OnboardingResponseDto = {
        orgId: mockOrgId,
        orgName: 'Creditor Corp',
        adminUserId: mockAdminUserId,
        adminEmail: 'admin@creditor-corp.com',
        message: 'Organization successfully provisioned and activated',
        createdAt: new Date(),
      };

      mockOnboardingService.provisionOrganization.mockResolvedValue(
        mockResponse,
      );

      await controller.provisionOrganization(provisionDto, mockRequest);

      expect(service.provisionOrganization).toHaveBeenCalledWith({
        ...provisionDto,
        createdBy: mockPlatformAdminId,
      });
      expect(provisionDto.organization.organizationType).toBe(
        OrganizationType.CREDITOR,
      );
    });

    it('should set createdBy from authenticated user', async () => {
      const provisionDto = {
        organization: {
          name: 'Test Agency',
          displayName: 'Test Collections',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        },
        initialAdmin: {
          email: 'admin@test.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      const customPlatformAdminId = 'custom-platform-admin-id';
      const mockRequest = {
        user: { sub: customPlatformAdminId },
      } as unknown as Request;

      const mockResponse: OnboardingResponseDto = {
        orgId: mockOrgId,
        orgName: 'Test Agency',
        adminUserId: mockAdminUserId,
        adminEmail: 'admin@test.com',
        message: 'Organization successfully provisioned and activated',
        createdAt: new Date(),
      };

      mockOnboardingService.provisionOrganization.mockResolvedValue(
        mockResponse,
      );

      await controller.provisionOrganization(provisionDto, mockRequest);

      expect(service.provisionOrganization).toHaveBeenCalledWith({
        ...provisionDto,
        createdBy: customPlatformAdminId,
      });
    });

    it('should handle missing user in request gracefully', async () => {
      const provisionDto = {
        organization: {
          name: 'Test Agency',
          displayName: 'Test Collections',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        },
        initialAdmin: {
          email: 'admin@test.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      const mockRequest = {} as Request;

      const mockResponse: OnboardingResponseDto = {
        orgId: mockOrgId,
        orgName: 'Test Agency',
        adminUserId: mockAdminUserId,
        adminEmail: 'admin@test.com',
        message: 'Organization successfully provisioned and activated',
        createdAt: new Date(),
      };

      mockOnboardingService.provisionOrganization.mockResolvedValue(
        mockResponse,
      );

      await controller.provisionOrganization(provisionDto, mockRequest);

      expect(service.provisionOrganization).toHaveBeenCalledWith({
        ...provisionDto,
        createdBy: undefined,
      });
    });
  });

  // ==========================================================================
  // Get Onboarding Status Tests
  // ==========================================================================

  describe('getOnboardingStatus', () => {
    it('should return onboarding status for an organization', async () => {
      const mockResponse: OnboardingStatusResponseDto = {
        orgId: mockOrgId,
        orgName: 'Acme Collection Agency',
        status: OrganizationStatus.ACTIVE,
        completedSteps: [
          OnboardingStep.ORGANIZATION_CREATED,
          OnboardingStep.ADMIN_USER_PROVISIONED,
          OnboardingStep.DEFAULT_SETTINGS_APPLIED,
          OnboardingStep.ORGANIZATION_ACTIVATED,
          OnboardingStep.EVENT_PUBLISHED,
        ],
        isComplete: true,
        createdAt: new Date('2025-10-18T09:55:00.000Z'),
        updatedAt: new Date('2025-10-18T10:00:00.000Z'),
      };

      mockOnboardingService.getOnboardingStatus.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getOnboardingStatus(mockOrgId);

      expect(service.getOnboardingStatus).toHaveBeenCalledWith(mockOrgId);
      expect(service.getOnboardingStatus).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.orgId).toBe(mockOrgId);
      expect(result.status).toBe(OrganizationStatus.ACTIVE);
      expect(result.isComplete).toBe(true);
    });

    it('should handle pending onboarding status', async () => {
      const mockResponse: OnboardingStatusResponseDto = {
        orgId: mockOrgId,
        orgName: 'Pending Agency',
        status: OrganizationStatus.PROVISIONING,
        completedSteps: [OnboardingStep.ORGANIZATION_CREATED],
        isComplete: false,
        createdAt: new Date('2025-10-18T10:00:00.000Z'),
        updatedAt: new Date('2025-10-18T10:00:00.000Z'),
      };

      mockOnboardingService.getOnboardingStatus.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getOnboardingStatus(mockOrgId);

      expect(service.getOnboardingStatus).toHaveBeenCalledWith(mockOrgId);
      expect(service.getOnboardingStatus).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.status).toBe(OrganizationStatus.PROVISIONING);
      expect(result.isComplete).toBe(false);
    });

    it('should handle failed onboarding status', async () => {
      // Note: The `error` field in the old mock is not part of the DTO.
      // Error conditions should be tested by mocking a thrown exception from the service.
      // This test is refactored to check for a valid DTO response with a 'SUSPENDED' status,
      // which might represent a failure state.
      const mockResponse: OnboardingStatusResponseDto = {
        orgId: mockOrgId,
        orgName: 'Failed Agency',
        status: OrganizationStatus.SUSPENDED, // Or another status representing failure
        completedSteps: [OnboardingStep.ORGANIZATION_CREATED],
        isComplete: false,
        createdAt: new Date('2025-10-18T10:00:00.000Z'),
        updatedAt: new Date('2025-10-18T10:01:00.000Z'),
      };

      mockOnboardingService.getOnboardingStatus.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getOnboardingStatus(mockOrgId);

      expect(service.getOnboardingStatus).toHaveBeenCalledWith(mockOrgId);
      expect(result.status).toBe(OrganizationStatus.SUSPENDED);
      expect(result.isComplete).toBe(false);
    });



    it('should pass different organization IDs correctly', async () => {
      const differentOrgId = '999e9999-e89b-12d3-a456-426614174999';

      const mockResponse: OnboardingStatusResponseDto = {
        orgId: differentOrgId,
        orgName: 'Different Agency',
        status: OrganizationStatus.ACTIVE,
        completedSteps: [
          OnboardingStep.ORGANIZATION_CREATED,
          OnboardingStep.ADMIN_USER_PROVISIONED,
          OnboardingStep.DEFAULT_SETTINGS_APPLIED,
          OnboardingStep.ORGANIZATION_ACTIVATED,
          OnboardingStep.EVENT_PUBLISHED,
        ],
        isComplete: true,
        createdAt: new Date('2025-10-18T11:00:00.000Z'),
        updatedAt: new Date('2025-10-18T11:05:00.000Z'),
      };

      mockOnboardingService.getOnboardingStatus.mockResolvedValue(
        mockResponse,
      );

      await controller.getOnboardingStatus(differentOrgId);

      expect(service.getOnboardingStatus).toHaveBeenCalledWith(differentOrgId);
      expect(service.getOnboardingStatus).toHaveBeenCalledTimes(1);
    });
  });
});