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
import { Repository } from 'typeorm';
import { SettingsService } from './settings.service';
import { Organization } from '../profiles/entities';
import { EventPublisher } from '@verichron/event-publisher';
import { OrganizationNotFoundException } from '../core/exceptions';
import { InvalidSettingsException } from './errors';
import { EVENT_TYPES } from '@verichron/events';
import { CommunicationCadence } from '@verichron/enums';
import { OrganizationSettingsUpdatedDto } from '../events/event-dto/organizations/organization-settings-updated.dto';

describe('SettingsService', () => {
  let service: SettingsService;
  let organizationRepository: Repository<Organization>;
  let eventPublisher: EventPublisher;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';

  const mockOrganization = new Organization();
  mockOrganization.id = mockOrgId;
  mockOrganization.settings = {};

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(Organization),
          useClass: Repository,
        },
        {
          provide: EventPublisher,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    organizationRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    eventPublisher = module.get<EventPublisher>(EventPublisher);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return organization settings', async () => {
      jest.spyOn(organizationRepository, 'findOne').mockResolvedValue(mockOrganization);

      const result = await service.getSettings(mockOrgId);

      expect(result.orgId).toBe(mockOrgId);
      expect(result.settings).toEqual(mockOrganization.settings);
    });

    it('should throw OrganizationNotFoundException if organization does not exist', async () => {
      jest.spyOn(organizationRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getSettings(mockOrgId)).rejects.toThrow(
        OrganizationNotFoundException,
      );
    });
  });

  describe('updateSettings', () => {
    it('should update and merge settings, then publish an event', async () => {
      const dto = {
        settings: {
          branding: {
            logoUrl: 'https://cdn.example.com/new-logo.png',
            primaryColorHex: '#1E40AF',
          },
          businessRules: {
            maxPaymentPlanDurationMonths: 12,
            minimumPaymentPlanPercentage: 0.1,
          },
        },
      };
      const expectedSettings = {
        branding: {
          logoUrl: 'https://cdn.example.com/new-logo.png',
          primaryColorHex: '#1E40AF',
        },
        businessRules: {
          maxPaymentPlanDurationMonths: 12,
          minimumPaymentPlanPercentage: 0.1,
        },
      };

      jest.spyOn(organizationRepository, 'findOne').mockResolvedValue(mockOrganization);
      jest.spyOn(organizationRepository, 'save').mockResolvedValue({ ...mockOrganization, settings: expectedSettings } as Organization);

      const result = await service.updateSettings(mockOrgId, dto, mockUserId);

      expect(organizationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ settings: expectedSettings }),
      );
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SETTINGS_UPDATED,
        expect.objectContaining({
          organizationId: mockOrgId,
          updatedBy: mockUserId,
          updatedSettingKeys: ['branding', 'businessRules'],
        }),
        OrganizationSettingsUpdatedDto,
      );
      expect(result.settings).toEqual(expectedSettings);
    });

    it('should throw InvalidSettingsException for invalid data', async () => {
        const dto = { settings: { branding: { primaryColorHex: 'not-a-hex-color' } } };
        jest.spyOn(organizationRepository, 'findOne').mockResolvedValue(mockOrganization);

        await expect(service.updateSettings(mockOrgId, dto, mockUserId)).rejects.toThrow(InvalidSettingsException);
    });
  });

  describe('replaceSettings', () => {
    it('should replace settings and publish an event', async () => {
      const dto = {
        settings: {
          communicationPreferences: {
            defaultCommunicationCadence: CommunicationCadence.WEEKLY,
          },
        },
      };

      jest.spyOn(organizationRepository, 'findOne').mockResolvedValue(mockOrganization);
      jest.spyOn(organizationRepository, 'save').mockResolvedValue({ ...mockOrganization, settings: dto.settings } as Organization);

      const result = await service.replaceSettings(mockOrgId, dto, mockUserId);

      expect(organizationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ settings: dto.settings }),
      );
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SETTINGS_UPDATED,
        expect.objectContaining({
          organizationId: mockOrgId,
          updatedBy: mockUserId,
          updatedSettingKeys: ['communicationPreferences'],
        }),
        OrganizationSettingsUpdatedDto,
      );
      expect(result.settings).toEqual(dto.settings);
    });

    it('should throw InvalidSettingsException for invalid data', async () => {
        const dto = { settings: { businessRules: { maxPaymentPlanDurationMonths: -1 } } };
        jest.spyOn(organizationRepository, 'findOne').mockResolvedValue(mockOrganization);

        await expect(service.replaceSettings(mockOrgId, dto, mockUserId)).rejects.toThrow(InvalidSettingsException);
    });
  });
});
