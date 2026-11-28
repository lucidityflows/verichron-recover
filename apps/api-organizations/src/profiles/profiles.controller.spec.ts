// Mock entities before importing anything else
jest.mock('./entities', () => ({
  Organization: class Organization {},
  OrganizationAddress: class OrganizationAddress {},
  OrganizationEmail: class OrganizationEmail {},
  OrganizationPhoneNumber: class OrganizationPhoneNumber {},
}));

// Mock the entity file that exports enums
jest.mock('./entities/organization-email.entity', () => ({
  OrganizationEmail: class OrganizationEmail {},
  EmailCategory: {
    GENERAL: 'GENERAL',
    BILLING: 'BILLING',
    SUPPORT: 'SUPPORT',
    LEGAL: 'LEGAL',
    TECHNICAL: 'TECHNICAL',
  },
}));

import { type TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import {
  OrganizationType,
  OrganizationStatus,
  AddressCategory,
  PhoneCategory,
  EmailCategory
} from '@verichron/enums';
import { JwtAuthGuard, PermissionsGuard } from '@verichron/auth';
import { type PaginatedResponseDto } from '../core/dto';
import {
  type OrganizationResponseDto,
  type AddressResponseDto,
  type EmailResponseDto,
  type PhoneNumberResponseDto,
} from './dto';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let service: ProfilesService;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const mockAddressId = '456e7890-e89b-12d3-a456-426614174111';
  const mockEmailId = '789e0123-e89b-12d3-a456-426614174222';
  const mockPhoneId = '012e3456-e89b-12d3-a456-426614174333';

  // Base mock objects for reuse
  const mockOrganization: OrganizationResponseDto = {
    id: mockOrgId,
    name: 'Acme Collections',
    displayName: 'Acme Collections Agency',
    organizationType: OrganizationType.COLLECTION_AGENCY,
    status: OrganizationStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAddress: AddressResponseDto = {
    id: mockAddressId,
    organizationId: mockOrgId,
    street1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
    isPrimary: true,
    addressCategory: AddressCategory.HEADQUARTERS,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEmail: EmailResponseDto = {
    id: mockEmailId,
    organizationId: mockOrgId,
    email: 'contact@acme.com',
    isPrimary: true,
    isVerified: true,
    emailCategory: EmailCategory.GENERAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPhoneNumber: PhoneNumberResponseDto = {
    id: mockPhoneId,
    organizationId: mockOrgId,
    phoneNumber: '+1234567890',
    category: PhoneCategory.BUSINESS,
    isPrimary: true,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProfilesService = {
    createOrganization: jest.fn(),
    findAllOrganizations: jest.fn(),
    findOneOrganization: jest.fn(),
    updateOrganization: jest.fn(),
    deleteOrganization: jest.fn(),
    findAllAddresses: jest.fn(),
    createAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
    findAllEmails: jest.fn(),
    createEmail: jest.fn(),
    updateEmail: jest.fn(),
    deleteEmail: jest.fn(),
    findAllPhoneNumbers: jest.fn(),
    createPhoneNumber: jest.fn(),
    updatePhoneNumber: jest.fn(),
    deletePhoneNumber: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ProfilesController>(ProfilesController);
    service = module.get<ProfilesService>(ProfilesService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==========================================================================
  // Organization Management Tests
  // ==========================================================================

  describe('findAllOrganizations', () => {
    it('should return paginated list of organizations', async () => {
      const query = {
        page: 1,
        pageSize: 10,
      };

      const mockResponse: PaginatedResponseDto<OrganizationResponseDto> = {
        data: [mockOrganization],
        meta: {
          total: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      mockProfilesService.findAllOrganizations.mockResolvedValue(mockResponse);

      const result = await controller.findAllOrganizations(query, mockOrgId);

      expect(service.findAllOrganizations).toHaveBeenCalledWith(query, mockOrgId);
      expect(service.findAllOrganizations).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should pass search and filter parameters to service', async () => {
      const query = {
        page: 1,
        pageSize: 20,
        search: 'Acme',
        status: OrganizationStatus.ACTIVE,
        organizationType: OrganizationType.COLLECTION_AGENCY,
      };

      const mockResponse: PaginatedResponseDto<OrganizationResponseDto> = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      };

      mockProfilesService.findAllOrganizations.mockResolvedValue(mockResponse);

      await controller.findAllOrganizations(query, mockOrgId);

      expect(service.findAllOrganizations).toHaveBeenCalledWith(query, mockOrgId);
    });
  });

  describe('findOneOrganization', () => {
    it('should return a single organization', async () => {
      mockProfilesService.findOneOrganization.mockResolvedValue(mockOrganization);

      const result = await controller.findOneOrganization(mockOrgId);

      expect(service.findOneOrganization).toHaveBeenCalledWith(mockOrgId);
      expect(service.findOneOrganization).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockOrganization);
      expect(result.id).toBe(mockOrgId);
    });
  });

  describe('updateOrganization', () => {
    it('should update an organization', async () => {
      const updateDto = {
        displayName: 'Updated Display Name',
        status: OrganizationStatus.INACTIVE,
      };

      const mockResponse: OrganizationResponseDto = {
        ...mockOrganization,
        ...updateDto,
        updatedAt: new Date(),
      };

      mockProfilesService.updateOrganization.mockResolvedValue(mockResponse);

      const result = await controller.updateOrganization(mockOrgId, updateDto);

      expect(service.updateOrganization).toHaveBeenCalledWith(
        mockOrgId,
        updateDto,
      );
      expect(service.updateOrganization).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.displayName).toBe(updateDto.displayName);
      expect(result.status).toBe(updateDto.status);
    });
  });

  // ==========================================================================
  // Address Management Tests
  // ==========================================================================

  describe('findAllAddresses', () => {
    it('should return all addresses for an organization', async () => {
      const mockResponse: AddressResponseDto[] = [mockAddress];

      mockProfilesService.findAllAddresses.mockResolvedValue(mockResponse);

      const result = await controller.findAllAddresses(mockOrgId);

      expect(service.findAllAddresses).toHaveBeenCalledWith(mockOrgId);
      expect(service.findAllAddresses).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe(mockOrgId);
    });
  });

  describe('createAddress', () => {
    it('should create a new address for an organization', async () => {
      const createDto = {
        street1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        isPrimary: true,
        addressCategory: AddressCategory.HEADQUARTERS,
      };

      mockProfilesService.createAddress.mockResolvedValue(mockAddress);

      const result = await controller.createAddress(mockOrgId, createDto);

      expect(service.createAddress).toHaveBeenCalledWith(mockOrgId, createDto);
      expect(service.createAddress).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAddress);
      expect(result.organizationId).toBe(mockOrgId);
      expect(result.street1).toBe(createDto.street1);
    });
  });

  describe('updateAddress', () => {
    it('should update an organization address', async () => {
      const updateDto = {
        street1: '456 Updated St',
        city: 'Boston',
      };

      const mockResponse: AddressResponseDto = {
        ...mockAddress,
        ...updateDto,
        updatedAt: new Date(),
      };

      mockProfilesService.updateAddress.mockResolvedValue(mockResponse);

      const result = await controller.updateAddress(
        mockOrgId,
        mockAddressId,
        updateDto,
      );

      expect(service.updateAddress).toHaveBeenCalledWith(
        mockOrgId,
        mockAddressId,
        updateDto,
      );
      expect(service.updateAddress).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.street1).toBe(updateDto.street1);
      expect(result.city).toBe(updateDto.city);
    });
  });

  describe('deleteAddress', () => {
    it('should delete an organization address', async () => {
      mockProfilesService.deleteAddress.mockResolvedValue(undefined);

      const result = await controller.deleteAddress(mockOrgId, mockAddressId);

      expect(service.deleteAddress).toHaveBeenCalledWith(
        mockOrgId,
        mockAddressId,
      );
      expect(service.deleteAddress).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // Email Management Tests
  // ==========================================================================

  describe('findAllEmails', () => {
    it('should return all emails for an organization', async () => {
      const mockResponse: EmailResponseDto[] = [mockEmail];
      mockProfilesService.findAllEmails.mockResolvedValue(mockResponse);

      const result = await controller.findAllEmails(mockOrgId);

      expect(service.findAllEmails).toHaveBeenCalledWith(mockOrgId);
      expect(service.findAllEmails).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe(mockOrgId);
    });
  });

  describe('createEmail', () => {
    it('should create a new email for an organization', async () => {
      const createDto = {
        email: 'info@acme.com',
        isPrimary: false,
        emailCategory: EmailCategory.SUPPORT,
      };

      const mockResponse: EmailResponseDto = {
        id: mockEmailId,
        organizationId: mockOrgId,
        ...createDto,
        isVerified: false, // default
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProfilesService.createEmail.mockResolvedValue(mockResponse);

      const result = await controller.createEmail(mockOrgId, createDto);

      expect(service.createEmail).toHaveBeenCalledWith(mockOrgId, createDto);
      expect(service.createEmail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.organizationId).toBe(mockOrgId);
      expect(result.email).toBe(createDto.email);
    });
  });

  describe('updateEmail', () => {
    it('should update an organization email', async () => {
      const updateDto = {
        email: 'updated@acme.com',
        isPrimary: true,
      };

      const mockResponse: EmailResponseDto = {
        ...mockEmail,
        ...updateDto,
        updatedAt: new Date(),
      };

      mockProfilesService.updateEmail.mockResolvedValue(mockResponse);

      const result = await controller.updateEmail(
        mockOrgId,
        mockEmailId,
        updateDto,
      );

      expect(service.updateEmail).toHaveBeenCalledWith(
        mockOrgId,
        mockEmailId,
        updateDto,
      );
      expect(service.updateEmail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.email).toBe(updateDto.email);
      expect(result.isPrimary).toBe(updateDto.isPrimary);
    });
  });

  describe('deleteEmail', () => {
    it('should delete an organization email', async () => {
      mockProfilesService.deleteEmail.mockResolvedValue(undefined);

      const result = await controller.deleteEmail(mockOrgId, mockEmailId);

      expect(service.deleteEmail).toHaveBeenCalledWith(mockOrgId, mockEmailId);
      expect(service.deleteEmail).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // Phone Number Management Tests
  // ==========================================================================

  describe('findAllPhoneNumbers', () => {
    it('should return all phone numbers for an organization', async () => {
      const mockResponse: PhoneNumberResponseDto[] = [mockPhoneNumber];
      mockProfilesService.findAllPhoneNumbers.mockResolvedValue(mockResponse);

      const result = await controller.findAllPhoneNumbers(mockOrgId);

      expect(service.findAllPhoneNumbers).toHaveBeenCalledWith(mockOrgId);
      expect(service.findAllPhoneNumbers).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe(mockOrgId);
    });
  });

  describe('createPhoneNumber', () => {
    it('should create a new phone number for an organization', async () => {
      const createDto = {
        phoneNumber: '+0987654321',
        category: PhoneCategory.MOBILE,
        isPrimary: false,
      };

      const mockResponse: PhoneNumberResponseDto = {
        id: mockPhoneId,
        organizationId: mockOrgId,
        ...createDto,
        isVerified: false, // default
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProfilesService.createPhoneNumber.mockResolvedValue(mockResponse);

      const result = await controller.createPhoneNumber(mockOrgId, createDto);

      expect(service.createPhoneNumber).toHaveBeenCalledWith(
        mockOrgId,
        createDto,
      );
      expect(service.createPhoneNumber).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.organizationId).toBe(mockOrgId);
      expect(result.phoneNumber).toBe(createDto.phoneNumber);
    });
  });

  describe('updatePhoneNumber', () => {
    it('should update an organization phone number', async () => {
      const updateDto = {
        phoneNumber: '+9999999999',
        isPrimary: true,
      };

      const mockResponse: PhoneNumberResponseDto = {
        ...mockPhoneNumber,
        ...updateDto,
        updatedAt: new Date(),
      };

      mockProfilesService.updatePhoneNumber.mockResolvedValue(mockResponse);

      const result = await controller.updatePhoneNumber(
        mockOrgId,
        mockPhoneId,
        updateDto,
      );

      expect(service.updatePhoneNumber).toHaveBeenCalledWith(
        mockOrgId,
        mockPhoneId,
        updateDto,
      );
      expect(service.updatePhoneNumber).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.phoneNumber).toBe(updateDto.phoneNumber);
      expect(result.isPrimary).toBe(updateDto.isPrimary);
    });
  });

  describe('deletePhoneNumber', () => {
    it('should delete an organization phone number', async () => {
      mockProfilesService.deletePhoneNumber.mockResolvedValue(undefined);

      const result = await controller.deletePhoneNumber(mockOrgId, mockPhoneId);

      expect(service.deletePhoneNumber).toHaveBeenCalledWith(
        mockOrgId,
        mockPhoneId,
      );
      expect(service.deletePhoneNumber).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });
});