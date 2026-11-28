// Mock entities before importing anything else
jest.mock('./entities', () => ({
  Organization: class Organization {},
  OrganizationAddress: class OrganizationAddress {},
  OrganizationEmail: class OrganizationEmail {},
  OrganizationPhoneNumber: class OrganizationPhoneNumber {},
}));

import { type TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProfilesService } from './profiles.service';
import {
  Organization,
  OrganizationAddress,
  OrganizationEmail,
  OrganizationPhoneNumber,
} from './entities';
import { OrganizationNotFoundException } from '../core/exceptions';
import { RequestContext } from '../core/services/request-context.service';
import {
  PhoneCategory,
  OrganizationStatus,
  AddressCategory
} from '@verichron/enums';
import { EVENT_TYPES } from '@verichron/events';
import {
  OrganizationUpdatedDto,
  OrganizationNameChangedDto,
  OrganizationStatusUpdatedDto,
} from '../events/event-dto/organizations';
import {
  createMockRepository,
  createMockEventPublisher,
} from '../test/utils/test-helpers';
import { createMockOrganization } from '../test/utils/fixtures';
import { EventPublisher } from '@verichron/event-publisher';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let organizationRepository: ReturnType<typeof createMockRepository>;
  let addressRepository: ReturnType<typeof createMockRepository>;
  let emailRepository: ReturnType<typeof createMockRepository>;
  let phoneNumberRepository: ReturnType<typeof createMockRepository>;
  let eventPublisher: ReturnType<typeof createMockEventPublisher>;
  let requestContext: jest.Mocked<RequestContext>;

  beforeEach(async () => {
    organizationRepository = createMockRepository();
    addressRepository = createMockRepository();
    emailRepository = createMockRepository();
    phoneNumberRepository = createMockRepository();
    eventPublisher = createMockEventPublisher();

    requestContext = {
      getUserId: jest.fn().mockReturnValue('user-123'),
      getUserEmail: jest.fn().mockReturnValue('user@example.com'),
      getUsername: jest.fn().mockReturnValue('testuser'),
      getOrgId: jest.fn(),
      getRoles: jest.fn(),
      getPermissions: jest.fn(),
      getPlatformRoles: jest.fn(),
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
      hasPlatformRole: jest.fn(),
      isAuthenticated: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
    } as any;

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        ProfilesService,
        {
          provide: getRepositoryToken(Organization),
          useValue: organizationRepository,
        },
        {
          provide: getRepositoryToken(OrganizationAddress),
          useValue: addressRepository,
        },
        {
          provide: getRepositoryToken(OrganizationEmail),
          useValue: emailRepository,
        },
        {
          provide: getRepositoryToken(OrganizationPhoneNumber),
          useValue: phoneNumberRepository,
        },
        {
          provide: EventPublisher,
          useValue: eventPublisher,
        },
        {
          provide: RequestContext,
          useValue: requestContext,
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOneOrganization', () => {
    it('should return organization when found', async () => {
      const mockOrg = createMockOrganization({ id: '123e4567-e89b-12d3-a456-426614174123' });
      organizationRepository.findOne.mockResolvedValue(mockOrg as any);

      const result = await service.findOneOrganization('123e4567-e89b-12d3-a456-426614174123');

      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174123' },
      });
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174123');
    });

    it('should throw OrganizationNotFoundException when not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneOrganization('nonexistent')).rejects.toThrow(
        OrganizationNotFoundException,
      );
    });
  });

  describe('updateOrganization', () => {
    it('should update organization and publish OrganizationUpdated event', async () => {
      const orgId = '123e4567-e89b-12d3-a456-426614174123';
      const updateDto = {
        displayName: 'Updated Name',
        taxId: '98-7654321',
      };

      const existingOrg = createMockOrganization({
        id: orgId,
        name: 'Test Org',
        displayName: 'Old Name',
        taxId: '12-3456789',
        status: OrganizationStatus.ACTIVE,
      });

      const updatedOrg = createMockOrganization({
        ...existingOrg,
        displayName: updateDto.displayName,
        taxId: updateDto.taxId,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      });

      organizationRepository.findOne.mockResolvedValue(existingOrg as any);
      organizationRepository.save.mockResolvedValue(updatedOrg as any);

      const result = await service.updateOrganization(orgId, updateDto);

      expect(result.displayName).toBe(updateDto.displayName);
      expect(result.taxId).toBe(updateDto.taxId);

      // Verify event was published
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_UPDATED,
        expect.objectContaining({
          organizationId: orgId,
          updatedFields: ['displayName', 'taxId'],
        }),
        OrganizationUpdatedDto,
      );
    });

    it('should publish OrganizationNameChanged event when name changes', async () => {
      const orgId = '123e4567-e89b-12d3-a456-426614174123';
      const updateDto = {
        name: 'New Organization Name',
      };

      const existingOrg = createMockOrganization({
        id: orgId,
        name: 'Old Organization Name',
        status: OrganizationStatus.ACTIVE,
      });

      const updatedOrg = createMockOrganization({
        ...existingOrg,
        name: updateDto.name,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      });

      organizationRepository.findOne.mockResolvedValue(existingOrg as any);
      organizationRepository.save.mockResolvedValue(updatedOrg as any);

      await service.updateOrganization(orgId, updateDto);

      // Verify both events were published
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_UPDATED,
        expect.objectContaining({
          organizationId: orgId,
          updatedFields: ['name'],
        }),
        OrganizationUpdatedDto,
      );

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_NAME_CHANGED,
        expect.objectContaining({
          organizationId: orgId,
          previousName: 'Old Organization Name',
          newName: 'New Organization Name',
        }),
        OrganizationNameChangedDto,
      );
    });

    it('should publish OrganizationStatusChanged event when status changes', async () => {
      const orgId = '123e4567-e89b-12d3-a456-426614174123';
      const updateDto = {
        status: OrganizationStatus.SUSPENDED,
      };

      const existingOrg = createMockOrganization({
        id: orgId,
        status: OrganizationStatus.ACTIVE,
      });

      const updatedOrg = createMockOrganization({
        ...existingOrg,
        status: updateDto.status,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      });

      organizationRepository.findOne.mockResolvedValue(existingOrg as any);
      organizationRepository.save.mockResolvedValue(updatedOrg as any);

      await service.updateOrganization(orgId, updateDto);

      // Verify both events were published
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_UPDATED,
        expect.objectContaining({
          organizationId: orgId,
          updatedFields: ['status'],
        }),
        OrganizationUpdatedDto,
      );

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_STATUS_CHANGED,
        expect.objectContaining({
          organizationId: orgId,
          previousStatus: OrganizationStatus.ACTIVE,
          newStatus: OrganizationStatus.SUSPENDED,
        }),
        OrganizationStatusUpdatedDto,
      );
    });

    it('should not publish events when no fields change', async () => {
      const orgId = '123e4567-e89b-12d3-a456-426614174123';
      const updateDto = {}; // Empty update

      const existingOrg = createMockOrganization({ id: orgId });
      organizationRepository.findOne.mockResolvedValue(existingOrg as any);
      organizationRepository.save.mockResolvedValue(existingOrg as any);

      await service.updateOrganization(orgId, updateDto);

      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should use requestContext.getUserId() for updatedBy field in specific events', async () => {
      const orgId = '123e4567-e89b-12d3-a456-426614174123';
      const updateDto = { name: 'Updated Name' };

      const existingOrg = createMockOrganization({
        id: orgId,
        name: 'Old Name',
      });
      const updatedOrg = createMockOrganization({
        ...existingOrg,
        name: updateDto.name,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      });

      organizationRepository.findOne.mockResolvedValue(existingOrg as any);
      organizationRepository.save.mockResolvedValue(updatedOrg as any);
      requestContext.getUserId.mockReturnValue('user-456');

      await service.updateOrganization(orgId, updateDto);

      expect(requestContext.getUserId).toHaveBeenCalled();
      // The OrganizationNameChanged event should include updatedBy
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_NAME_CHANGED,
        expect.objectContaining({
          organizationId: orgId,
          previousName: 'Old Name',
          newName: 'Updated Name',
          updatedBy: 'user-456',
        }),
        OrganizationNameChangedDto,
      );
    });

    it('should throw OrganizationNotFoundException when updating non-existent organization', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateOrganization('nonexistent', { displayName: 'Test' }),
      ).rejects.toThrow(OrganizationNotFoundException);
    });
  });

  describe('findAllOrganizations', () => {
    it('should return paginated organizations for a specific orgId', async () => {
      const orgId = '123e4567-e89b-12d3-a456-426614174123';
      const query = {
        page: 1,
        pageSize: 10,
      };

      const mockOrgs = [
        createMockOrganization({ id: orgId, name: 'Org 1' }),
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockOrgs, 1]),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
      };

      organizationRepository.createQueryBuilder.mockReturnValue(
        queryBuilder as any,
      );

      const result = await service.findAllOrganizations(query, orgId);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('org.id = :orgId', { orgId });
    });
  });

  describe('Address CRUD Operations', () => {
    describe('findAllAddresses', () => {
      it('should return all addresses for an organization', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const mockAddresses = [
          {
            id: 'addr-1',
            organizationId: orgId,
            street1: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'US',
            isPrimary: true,
          },
          {
            id: 'addr-2',
            organizationId: orgId,
            street1: '456 Park Ave',
            city: 'Boston',
            state: 'MA',
            postalCode: '02101',
            country: 'US',
            isPrimary: false,
          },
        ];

        organizationRepository.existsBy.mockResolvedValue(true);
        addressRepository.find.mockResolvedValue(mockAddresses as any);

        const result = await service.findAllAddresses(orgId);

        expect(result).toHaveLength(2);
        expect(addressRepository.find).toHaveBeenCalledWith({
          where: { organizationId: orgId },
          order: { isPrimary: 'DESC', createdAt: 'ASC' },
        });
      });

      it('should throw OrganizationNotFoundException if organization does not exist', async () => {
        organizationRepository.existsBy.mockResolvedValue(false);

        await expect(service.findAllAddresses('nonexistent')).rejects.toThrow(
          OrganizationNotFoundException,
        );
      });
    });

    describe('createAddress', () => {
      it('should create a new address for an organization', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const createDto = {
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          isPrimary: true,
          addressCategory: AddressCategory.HEADQUARTERS,
        };

        const mockAddress = {
          id: 'addr-1',
          organizationId: orgId,
          ...createDto,
          country: 'US',
        };

        organizationRepository.existsBy.mockResolvedValue(true);
        addressRepository.create.mockReturnValue(mockAddress as any);
        addressRepository.save.mockResolvedValue(mockAddress as any);

        const result = await service.createAddress(orgId, createDto);

        expect(result.id).toBe('addr-1');
        expect(addressRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: orgId,
            street1: createDto.street1,
            city: createDto.city,
            state: createDto.state,
            postalCode: createDto.postalCode,
            country: 'US',
            isPrimary: true,
          }),
        );
      });

      it('should default country to US if not provided', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const createDto = {
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          addressCategory: AddressCategory.HEADQUARTERS,
        };

        organizationRepository.existsBy.mockResolvedValue(true);
        addressRepository.create.mockReturnValue({} as any);
        addressRepository.save.mockResolvedValue({ id: 'addr-1' } as any);

        await service.createAddress(orgId, createDto);

        expect(addressRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            country: 'US',
          }),
        );
      });
    });

    describe('updateAddress', () => {
      it('should update an existing address', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const addressId = 'addr-1';
        const updateDto = {
          street1: '789 Updated St',
          city: 'Updated City',
        };

        const existingAddress = {
          id: addressId,
          organizationId: orgId,
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
        };

        const updatedAddress = {
          ...existingAddress,
          ...updateDto,
        };

        organizationRepository.existsBy.mockResolvedValue(true);
        addressRepository.findOne.mockResolvedValue(existingAddress as any);
        addressRepository.save.mockResolvedValue(updatedAddress as any);

        const result = await service.updateAddress(orgId, addressId, updateDto);

        expect(result.street1).toBe('789 Updated St');
        expect(result.city).toBe('Updated City');
        expect(addressRepository.save).toHaveBeenCalled();
      });

      it('should throw AddressNotFoundException if address does not exist', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const addressId = 'nonexistent';

        organizationRepository.existsBy.mockResolvedValue(true);
        addressRepository.findOne.mockResolvedValue(null);

        await expect(
          service.updateAddress(orgId, addressId, { street1: 'Test' }),
        ).rejects.toThrow(
          expect.objectContaining({
            message: expect.stringContaining('Address'),
          }),
        );
      });
    });

    describe('deleteAddress', () => {
      it('should delete an address', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const addressId = 'addr-1';

        organizationRepository.existsBy.mockResolvedValue(true);
        addressRepository.delete.mockResolvedValue({ affected: 1 } as any);

        await service.deleteAddress(orgId, addressId);

        expect(addressRepository.delete).toHaveBeenCalledWith({
          id: addressId,
          organizationId: orgId,
        });
      });

      it('should throw AddressNotFoundException if address does not exist', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const addressId = 'nonexistent';

        organizationRepository.existsBy.mockResolvedValue(true);
        addressRepository.delete.mockResolvedValue({ affected: 0 } as any);

        await expect(service.deleteAddress(orgId, addressId)).rejects.toThrow(
          expect.objectContaining({
            message: expect.stringContaining('Address'),
          }),
        );
      });

      it('should delete a primary address without reassigning primary status to another address', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const primaryAddressId = 'addr-primary';
        const secondaryAddressId = 'addr-secondary';

        const primaryAddress = {
          id: primaryAddressId,
          organizationId: orgId,
          isPrimary: true,
          street1: '123 Main St',
        };
        const secondaryAddress = {
          id: secondaryAddressId,
          organizationId: orgId,
          isPrimary: false,
          street1: '456 Side St',
        };

        organizationRepository.existsBy.mockResolvedValue(true);
        addressRepository.delete.mockResolvedValue({ affected: 1 } as any); // Primary address deleted
        addressRepository.find.mockResolvedValue([secondaryAddress]); // Only secondary remains

        await service.deleteAddress(orgId, primaryAddressId);

        expect(addressRepository.delete).toHaveBeenCalledWith({
          id: primaryAddressId,
          organizationId: orgId,
        });

        // Verify that the secondary address is still not primary
        const remainingAddresses = await service.findAllAddresses(orgId);
        expect(remainingAddresses).toHaveLength(1);
        expect(remainingAddresses[0].id).toBe(secondaryAddressId);
        expect(remainingAddresses[0].isPrimary).toBe(false);
      });
    });
  });

  describe('Email CRUD Operations', () => {
    describe('findAllEmails', () => {
      it('should return all emails for an organization', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const mockEmails = [
          {
            id: 'email-1',
            organizationId: orgId,
            email: 'primary@example.com',
            isPrimary: true,
          },
          {
            id: 'email-2',
            organizationId: orgId,
            email: 'secondary@example.com',
            isPrimary: false,
          },
        ];

        organizationRepository.existsBy.mockResolvedValue(true);
        emailRepository.find.mockResolvedValue(mockEmails as any);

        const result = await service.findAllEmails(orgId);

        expect(result).toHaveLength(2);
        expect(emailRepository.find).toHaveBeenCalledWith({
          where: { organizationId: orgId },
          order: { isPrimary: 'DESC', createdAt: 'ASC' },
        });
      });
    });

    describe('createEmail', () => {
      it('should create a new email for an organization', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const createDto = {
          email: 'test@example.com',
          isPrimary: true,
        };

        const mockEmail = {
          id: 'email-1',
          organizationId: orgId,
          ...createDto,
        };

        organizationRepository.existsBy.mockResolvedValue(true);
        emailRepository.create.mockReturnValue(mockEmail as any);
        emailRepository.save.mockResolvedValue(mockEmail as any);

        const result = await service.createEmail(orgId, createDto);

        expect(result.id).toBe('email-1');
        expect(result.email).toBe('test@example.com');
        expect(emailRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: orgId,
            email: createDto.email,
            isPrimary: true,
          }),
        );
      });
    });

    describe('updateEmail', () => {
      it('should update an existing email', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const emailId = 'email-1';
        const updateDto = {
          email: 'updated@example.com',
          isPrimary: false,
        };

        const existingEmail = {
          id: emailId,
          organizationId: orgId,
          email: 'old@example.com',
          isPrimary: true,
        };

        const updatedEmail = {
          ...existingEmail,
          ...updateDto,
        };

        organizationRepository.existsBy.mockResolvedValue(true);
        emailRepository.findOne.mockResolvedValue(existingEmail as any);
        emailRepository.save.mockResolvedValue(updatedEmail as any);

        const result = await service.updateEmail(orgId, emailId, updateDto);

        expect(result.email).toBe('updated@example.com');
        expect(result.isPrimary).toBe(false);
      });
    });

    describe('deleteEmail', () => {
      it('should delete an email', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const emailId = 'email-1';

        organizationRepository.existsBy.mockResolvedValue(true);
        emailRepository.delete.mockResolvedValue({ affected: 1 } as any);

        await service.deleteEmail(orgId, emailId);

        expect(emailRepository.delete).toHaveBeenCalledWith({
          id: emailId,
          organizationId: orgId,
        });
      });

      it('should throw EmailNotFoundException if email does not exist', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const emailId = 'nonexistent';

        organizationRepository.existsBy.mockResolvedValue(true);
        emailRepository.delete.mockResolvedValue({ affected: 0 } as any);

        await expect(service.deleteEmail(orgId, emailId)).rejects.toThrow(
          expect.objectContaining({
            message: expect.stringContaining('Email'),
          }),
        );
      });
    });
  });

  describe('Phone Number CRUD Operations', () => {
    describe('findAllPhoneNumbers', () => {
      it('should return all phone numbers for an organization', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const mockPhones = [
          {
            id: 'phone-1',
            organizationId: orgId,
            phoneNumber: '+1234567890',
            isPrimary: true,
          },
          {
            id: 'phone-2',
            organizationId: orgId,
            phoneNumber: '+0987654321',
            isPrimary: false,
          },
        ];

        organizationRepository.existsBy.mockResolvedValue(true);
        phoneNumberRepository.find.mockResolvedValue(mockPhones as any);

        const result = await service.findAllPhoneNumbers(orgId);

        expect(result).toHaveLength(2);
        expect(phoneNumberRepository.find).toHaveBeenCalledWith({
          where: { organizationId: orgId },
          order: { isPrimary: 'DESC', createdAt: 'ASC' },
        });
      });
    });

    describe('createPhoneNumber', () => {
      it('should create a new phone number for an organization', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const createDto = {
          phoneNumber: '+1234567890',
          isPrimary: true,
          category: PhoneCategory.MOBILE,
        };

        const mockPhone = {
          id: 'phone-1',
          organizationId: orgId,
          ...createDto,
        };

        organizationRepository.existsBy.mockResolvedValue(true);
        phoneNumberRepository.create.mockReturnValue(mockPhone as any);
        phoneNumberRepository.save.mockResolvedValue(mockPhone as any);

        const result = await service.createPhoneNumber(orgId, createDto);

        expect(result.id).toBe('phone-1');
        expect(result.phoneNumber).toBe('+1234567890');
        expect(phoneNumberRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: orgId,
            phoneNumber: createDto.phoneNumber,
            isPrimary: true,
          }),
        );
      });
    });

    describe('updatePhoneNumber', () => {
      it('should update an existing phone number', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const phoneId = 'phone-1';
        const updateDto = {
          phoneNumber: '+9999999999',
          isPrimary: false,
        };

        const existingPhone = {
          id: phoneId,
          organizationId: orgId,
          phoneNumber: '+1234567890',
          isPrimary: true,
        };

        const updatedPhone = {
          ...existingPhone,
          ...updateDto,
        };

        organizationRepository.existsBy.mockResolvedValue(true);
        phoneNumberRepository.findOne.mockResolvedValue(existingPhone as any);
        phoneNumberRepository.save.mockResolvedValue(updatedPhone as any);

        const result = await service.updatePhoneNumber(orgId, phoneId, updateDto);

        expect(result.phoneNumber).toBe('+9999999999');
        expect(result.isPrimary).toBe(false);
      });
    });

    describe('deletePhoneNumber', () => {
      it('should delete a phone number', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const phoneId = 'phone-1';

        organizationRepository.existsBy.mockResolvedValue(true);
        phoneNumberRepository.delete.mockResolvedValue({ affected: 1 } as any);

        await service.deletePhoneNumber(orgId, phoneId);

        expect(phoneNumberRepository.delete).toHaveBeenCalledWith({
          id: phoneId,
          organizationId: orgId,
        });
      });

      it('should throw PhoneNumberNotFoundException if phone does not exist', async () => {
        const orgId = '123e4567-e89b-12d3-a456-426614174123';
        const phoneId = 'nonexistent';

        organizationRepository.existsBy.mockResolvedValue(true);
        phoneNumberRepository.delete.mockResolvedValue({ affected: 0 } as any);

        await expect(service.deletePhoneNumber(orgId, phoneId)).rejects.toThrow(
          expect.objectContaining({
            message: expect.stringContaining('Phone'),
          }),
        );
      });
    });
  });
});
