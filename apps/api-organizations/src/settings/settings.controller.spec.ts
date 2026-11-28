// Mock entities before importing anything else
jest.mock('../profiles/entities', () => ({
  Organization: class Organization {},
  OrganizationAddress: class OrganizationAddress {},
  OrganizationEmail: class OrganizationEmail {},
  OrganizationPhoneNumber: class OrganizationPhoneNumber {},
}));

import { type TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '@verichron/auth';
import { type OrganizationSettingsResponseDto, type UpdateOrganizationSettingsDto, type ReplaceOrganizationSettingsDto } from './dto';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: SettingsService;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '456e7890-e89b-12d3-a456-426614174111';

  const mockFullSettings = {
    branding: {
      logoUrl: 'https://cdn.example.com/logo.png',
      primaryColorHex: '#1E40AF',
      secondaryColorHex: '#F59E0B',
    },
    compliance: {
      fdcpaStrictMode: true,
      recordAllCalls: true,
      requireCallDisclosure: true,
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      adminAlerts: ['payment_received', 'dispute_filed'],
    },
  };

  const mockSettingsService = {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    replaceSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<SettingsController>(SettingsController);
    service = module.get<SettingsService>(SettingsService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==========================================================================
  // Get Settings Tests
  // ==========================================================================

  describe('getSettings', () => {
    it('should return organization settings', async () => {
      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: mockOrgId,
        settings: mockFullSettings,
        updatedAt: new Date(),
        updatedBy: mockUserId,
      };

      mockSettingsService.getSettings.mockResolvedValue(mockResponse);

      const result = await controller.getSettings(mockOrgId);

      expect(service.getSettings).toHaveBeenCalledWith(mockOrgId);
      expect(service.getSettings).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.orgId).toBe(mockOrgId);
      expect(result.settings.branding.logoUrl).toBe(
        'https://cdn.example.com/logo.png',
      );
    });

    it('should return empty settings for new organization', async () => {
      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: mockOrgId,
        settings: {},
        updatedAt: new Date(),
        updatedBy: null,
      };

      mockSettingsService.getSettings.mockResolvedValue(mockResponse);

      const result = await controller.getSettings(mockOrgId);

      expect(service.getSettings).toHaveBeenCalledWith(mockOrgId);
      expect(service.getSettings).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.settings).toEqual({});
    });

    it('should handle different organization IDs', async () => {
      const differentOrgId = '999e9999-e89b-12d3-a456-426614174999';

      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: differentOrgId,
        settings: {
          customField: 'value',
        },
        updatedAt: new Date(),
        updatedBy: mockUserId,
      };

      mockSettingsService.getSettings.mockResolvedValue(mockResponse);

      await controller.getSettings(differentOrgId);

      expect(service.getSettings).toHaveBeenCalledWith(differentOrgId);
      expect(service.getSettings).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Update Settings (PATCH) Tests
  // ==========================================================================

  describe('updateSettings', () => {
    it('should partially update settings', async () => {
      const updateDto: UpdateOrganizationSettingsDto = {
        settings: {
          branding: {
            logoUrl: 'https://cdn.example.com/new-logo.png',
          },
        },
      };

      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: mockOrgId,
        settings: {
          ...mockFullSettings,
          branding: {
            ...mockFullSettings.branding,
            logoUrl: 'https://cdn.example.com/new-logo.png',
          },
        },
        updatedAt: new Date(),
        updatedBy: mockUserId,
      };

      mockSettingsService.updateSettings.mockResolvedValue(mockResponse);

      const result = await controller.updateSettings(
        mockOrgId,
        updateDto,
        mockUserId,
      );

      expect(service.updateSettings).toHaveBeenCalledWith(
        mockOrgId,
        updateDto,
        mockUserId,
      );
      expect(service.updateSettings).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.updatedBy).toBe(mockUserId);
    });

    it('should update nested settings properties', async () => {
      const updateDto: UpdateOrganizationSettingsDto = {
        settings: {
          compliance: {
            fdcpaStrictMode: false,
          },
        },
      };

      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: mockOrgId,
        settings: {
          ...mockFullSettings,
          compliance: {
            ...mockFullSettings.compliance,
            fdcpaStrictMode: false,
          },
        },
        updatedAt: new Date(),
        updatedBy: mockUserId,
      };

      mockSettingsService.updateSettings.mockResolvedValue(mockResponse);

      const result = await controller.updateSettings(
        mockOrgId,
        updateDto,
        mockUserId,
      );

      expect(service.updateSettings).toHaveBeenCalledWith(
        mockOrgId,
        updateDto,
        mockUserId,
      );
      expect(result.settings.compliance.fdcpaStrictMode).toBe(false);
    });

    it('should add new settings properties', async () => {
      const updateDto: UpdateOrganizationSettingsDto = {
        settings: {
          businessRules: {
            maxPaymentPlanDurationMonths: 36,
          },
        },
      };
      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: mockOrgId,
        settings: {
          ...mockFullSettings,
          businessRules: {
            maxPaymentPlanDurationMonths: 36,
          },
        },
        updatedAt: new Date(),
        updatedBy: mockUserId,
      };

      mockSettingsService.updateSettings.mockResolvedValue(mockResponse);

      const result = await controller.updateSettings(
        mockOrgId,
        updateDto,
        mockUserId,
      );

      expect(service.updateSettings).toHaveBeenCalledWith(
        mockOrgId,
        updateDto,
        mockUserId,
      );
      expect(result.settings.businessRules).toBeDefined();
      expect(result.settings.businessRules.maxPaymentPlanDurationMonths).toBe(36);
    });

    it('should pass userId from decorator to service', async () => {
      const differentUserId = 'different-user-id';

      const updateDto: UpdateOrganizationSettingsDto = {
        settings: {
          branding: {
            logoUrl: 'https://new.logo.url/test.png',
          },
        },
      };

      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: mockOrgId,
        settings: { test: 'value' },
        updatedAt: new Date(),
        updatedBy: differentUserId,
      };

      mockSettingsService.updateSettings.mockResolvedValue(mockResponse);

      await controller.updateSettings(mockOrgId, updateDto, differentUserId);

      expect(service.updateSettings).toHaveBeenCalledWith(
        mockOrgId,
        updateDto,
        differentUserId,
      );
    });

    it('should handle empty settings update', async () => {
      const updateDto: UpdateOrganizationSettingsDto = {
        settings: {},
      };

      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: mockOrgId,
        settings: mockFullSettings,
        updatedAt: new Date(),
        updatedBy: mockUserId,
      };

      mockSettingsService.updateSettings.mockResolvedValue(mockResponse);

      const result = await controller.updateSettings(
        mockOrgId,
        updateDto,
        mockUserId,
      );

      expect(service.updateSettings).toHaveBeenCalledWith(
        mockOrgId,
        updateDto,
        mockUserId,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  // ==========================================================================
  // Replace Settings (PUT) Tests
  // ==========================================================================

  describe('replaceSettings', () => {
    it('should completely replace all settings', async () => {
      const replaceDto: ReplaceOrganizationSettingsDto = {
        settings: {
          branding: {
            primaryColorHex: '#FF0000',
          },
        },
      };

      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: mockOrgId,
        settings: {
          branding: {
            primaryColorHex: '#FF0000',
          },
        },
        updatedAt: new Date(),
        updatedBy: mockUserId,
      };

      mockSettingsService.replaceSettings.mockResolvedValue(mockResponse);

      const result = await controller.replaceSettings(
        mockOrgId,
        replaceDto,
        mockUserId,
      );

      expect(service.replaceSettings).toHaveBeenCalledWith(
        mockOrgId,
        replaceDto,
        mockUserId,
      );
      expect(service.replaceSettings).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.updatedBy).toBe(mockUserId);
    });

    it('should replace with empty settings', async () => {
      const replaceDto: ReplaceOrganizationSettingsDto = {
        settings: {},
      };

      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: mockOrgId,
        settings: {},
        updatedAt: new Date(),
        updatedBy: mockUserId,
      };

      mockSettingsService.replaceSettings.mockResolvedValue(mockResponse);

      const result = await controller.replaceSettings(
        mockOrgId,
        replaceDto,
        mockUserId,
      );

      expect(service.replaceSettings).toHaveBeenCalledWith(
        mockOrgId,
        replaceDto,
        mockUserId,
      );
      expect(result.settings).toEqual({});
    });

    it('should replace with complex nested settings', async () => {
      const replaceDto: ReplaceOrganizationSettingsDto = {
        settings: {
          compliance: {
            recordAllCalls: false,
          },
        },
      };

      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: mockOrgId,
        settings: replaceDto.settings,
        updatedAt: new Date(),
        updatedBy: mockUserId,
      };

      mockSettingsService.replaceSettings.mockResolvedValue(mockResponse);

      const result = await controller.replaceSettings(
        mockOrgId,
        replaceDto,
        mockUserId,
      );

      expect(service.replaceSettings).toHaveBeenCalledWith(
        mockOrgId,
        replaceDto,
        mockUserId,
      );
      expect(result.settings).toEqual(replaceDto.settings);
    });

    it('should pass userId from decorator to service', async () => {
      const differentUserId = 'another-user-id';

      const replaceDto: ReplaceOrganizationSettingsDto = {
        settings: {
          compliance: {
            fdcpaStrictMode: false,
          },
        },
      };

      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: mockOrgId,
        settings: { test: 'replaced' },
        updatedAt: new Date(),
        updatedBy: differentUserId,
      };

      mockSettingsService.replaceSettings.mockResolvedValue(mockResponse);

      await controller.replaceSettings(mockOrgId, replaceDto, differentUserId);

      expect(service.replaceSettings).toHaveBeenCalledWith(
        mockOrgId,
        replaceDto,
        differentUserId,
      );
    });

    it('should handle different organization IDs', async () => {
      const differentOrgId = '888e8888-e89b-12d3-a456-426614174888';

      const replaceDto: ReplaceOrganizationSettingsDto = {
        settings: {
          businessRules: {
            minimumPaymentPlanPercentage: 0.05,
          },
        },
      };

      const mockResponse: OrganizationSettingsResponseDto = {
        orgId: differentOrgId,
        settings: { custom: 'value' },
        updatedAt: new Date(),
        updatedBy: mockUserId,
      };

      mockSettingsService.replaceSettings.mockResolvedValue(mockResponse);

      await controller.replaceSettings(
        differentOrgId,
        replaceDto,
        mockUserId,
      );

      expect(service.replaceSettings).toHaveBeenCalledWith(
        differentOrgId,
        replaceDto,
        mockUserId,
      );
    });
  });
});
