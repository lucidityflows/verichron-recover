/**
 * ProfilesService Unit Tests
 *
 * SYSTEM RULES VALIDATED:
 * - R-DBR-PROF-001: create() must successfully create a new DebtorProfile and link it to the correct DebtorIdentity and organizationId
 * - R-DBR-PROF-002: create() must publish a DEBTORS_PROFILE_CREATED event upon successful creation
 * - R-DBR-PROF-003: create() must throw a ConflictException if a profile for that DebtorIdentity already exists in the given organizationId (tested via findOrCreateProfile)
 * - R-DBR-PROF-005: findOne() must retrieve a single DebtorProfile and correctly enforce organizationId scoping
 * - R-DBR-PROF-006: update() must successfully update a DebtorProfile and publish a DEBTORS_PROFILE_UPDATED event
 * - R-DBR-PROF-007: remove() (soft delete) must correctly update the deletedAt field and publish a DEBTORS_PROFILE_UPDATED event
 *
 * TESTING APPROACH:
 * - Unit tests in complete isolation
 * - All external dependencies (Repository, Services, EventPublisher, RequestContext) are mocked
 * - Tests focus on service business logic, organization scoping, and event publishing
 */

import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { DebtorProfileStatus } from '@verichron/enums';
import { ProfilesService } from './profiles.service';
import { DebtorProfileEntity } from './entities/debtor-profile.entity';
import { DebtorIdentityService } from '../identity/identity.service';
import { DebtorAddressService } from '../contact/services/address.service';
import { DebtorEmailService } from '../contact/services/email.service';
import { DebtorPhoneService } from '../contact/services/phone.service';
import { RequestContext } from '../core/services/request-context.service';
import { DebtorProfileCreatedDto } from '../events/event-dto/debtors/debtor-profile-created.dto';
import { DebtorUpdatedDto } from '../events/event-dto/debtors/debtor-updated.dto';
import { DebtorNotFoundException } from './errors';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let debtorRepository: jest.Mocked<Repository<DebtorProfileEntity>>;
  let identityService: jest.Mocked<DebtorIdentityService>;
  let addressService: jest.Mocked<DebtorAddressService>;
  let emailService: jest.Mocked<DebtorEmailService>;
  let phoneService: jest.Mocked<DebtorPhoneService>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let requestContext: jest.Mocked<RequestContext>;

  const mockOrgId = '550e8400-e29b-41d4-a716-446655440001';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440002';
  const mockProfileId = '550e8400-e29b-41d4-a716-446655440003';
  const mockIdentityId = '550e8400-e29b-41d4-a716-446655440004';

  const mockIdentity: any = {
    id: mockIdentityId,
    userId: null,
    profiles: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProfile: any = {
    id: mockProfileId,
    organizationId: mockOrgId,
    debtorIdentityId: mockIdentityId,
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'A',
    dateOfBirth: new Date('1990-01-01'),
    verificationStatus: 'UNVERIFIED',
    status: DebtorProfileStatus.PENDING_INVITATION,
    notes: 'Test notes',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    addresses: [],
    emails: [],
    phones: [],
  };

  beforeEach(async () => {
    const mockDebtorRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockIdentityService = {
      findOrCreateIdentity: jest.fn(),
      findIdentityByMatchingCriteria: jest.fn(),
    };

    const mockAddressService = {
      findByProfile: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockEmailService = {
      findByProfile: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockPhoneService = {
      findByProfile: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockEventPublisher = {
      publish: jest.fn(),
    };

    const mockRequestContext = {
      getOrgId: jest.fn(),
      getUserId: jest.fn(),
    };

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        ProfilesService,
        {
          provide: getRepositoryToken(DebtorProfileEntity),
          useValue: mockDebtorRepository,
        },
        {
          provide: DebtorIdentityService,
          useValue: mockIdentityService,
        },
        {
          provide: DebtorAddressService,
          useValue: mockAddressService,
        },
        {
          provide: DebtorEmailService,
          useValue: mockEmailService,
        },
        {
          provide: DebtorPhoneService,
          useValue: mockPhoneService,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
        {
          provide: RequestContext,
          useValue: mockRequestContext,
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    debtorRepository = module.get(getRepositoryToken(DebtorProfileEntity));
    identityService = module.get(DebtorIdentityService);
    addressService = module.get(DebtorAddressService);
    emailService = module.get(DebtorEmailService);
    phoneService = module.get(DebtorPhoneService);
    eventPublisher = module.get(EventPublisher);
    requestContext = module.get(RequestContext);

    // Default request context setup
    requestContext.getOrgId.mockReturnValue(mockOrgId);
    requestContext.getUserId.mockReturnValue(mockUserId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    describe('R-DBR-PROF-001: Creating new debtor profile', () => {
      it('should successfully create a new debtor profile and link to identity', async () => {
        const createDto = {
          firstName: 'John',
          lastName: 'Doe',
          middleName: 'A',
          dateOfBirth: '1990-01-01',
          userId: mockUserId,
        };

        identityService.findOrCreateIdentity.mockResolvedValue({
          identity: mockIdentity,
          isNew: true,
        });
        debtorRepository.create.mockReturnValue(mockProfile);
        debtorRepository.save.mockResolvedValue(mockProfile);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.create(createDto);

        expect(result).toEqual(mockProfile);
        expect(identityService.findOrCreateIdentity).toHaveBeenCalledWith({
          userId: mockUserId,
        });
        expect(debtorRepository.create).toHaveBeenCalledWith({
          ...createDto,
          organizationId: mockOrgId,
          debtorIdentityId: mockIdentityId,
          dateOfBirth: new Date('1990-01-01'),
        });
        expect(debtorRepository.save).toHaveBeenCalledWith(mockProfile);
      });

      it('should throw error if organization context is missing', async () => {
        requestContext.getOrgId.mockReturnValue(undefined);

        await expect(
          service.create({ firstName: 'John', lastName: 'Doe' }),
        ).rejects.toThrow('Organization context is required');
      });
    });

    describe('R-DBR-PROF-002: Publishing DEBTORS_PROFILE_CREATED event', () => {
      it('should publish event after creating profile', async () => {
        const createDto = {
          firstName: 'John',
          lastName: 'Doe',
        };

        identityService.findOrCreateIdentity.mockResolvedValue({
          identity: mockIdentity,
          isNew: true,
        });
        debtorRepository.create.mockReturnValue(mockProfile);
        debtorRepository.save.mockResolvedValue(mockProfile);
        eventPublisher.publish.mockResolvedValue('');

        await service.create(createDto);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_PROFILE_CREATED,
          expect.objectContaining({
            profileId: mockProfileId,
            identityId: mockIdentityId,
            organizationId: mockOrgId,
          }),
          DebtorProfileCreatedDto,
        );
      });
    });
  });

  describe('findOne', () => {
    describe('R-DBR-PROF-005: Finding single profile with org scoping', () => {
      it('should find debtor by ID within organization', async () => {
        debtorRepository.findOne.mockResolvedValue(mockProfile);

        const result = await service.findOne(mockProfileId);

        expect(result).toEqual(mockProfile);
        expect(debtorRepository.findOne).toHaveBeenCalledWith({
          where: { id: mockProfileId, organizationId: mockOrgId, deletedAt: IsNull() },
          relations: ['addresses', 'emails', 'phones'],
        });
      });

      it('should throw DebtorNotFoundException if debtor not found', async () => {
        debtorRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne(mockProfileId)).rejects.toThrow(
          DebtorNotFoundException,
        );
      });

      it('should enforce organization scoping', async () => {
        debtorRepository.findOne.mockResolvedValue(mockProfile);

        await service.findOne(mockProfileId);

        expect(debtorRepository.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              organizationId: mockOrgId,
            }),
          }),
        );
      });

      it('should throw error if organization context is missing', async () => {
        requestContext.getOrgId.mockReturnValue(undefined);

        await expect(service.findOne(mockProfileId)).rejects.toThrow(
          'Organization context is required',
        );
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated list of debtors for organization', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProfile], 1]),
      };

      debtorRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll({ page: 1, pageSize: 20 });

      expect(result).toEqual({
        data: [mockProfile],
        total: 1,
        page: 1,
        pageSize: 20,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'debtor.organizationId = :organizationId',
        { organizationId: mockOrgId },
      );
    });

    it('should apply search filter', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      debtorRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAll({ search: 'John', page: 1, pageSize: 20 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(debtor.firstName ILIKE :search OR debtor.lastName ILIKE :search)',
        { search: '%John%' },
      );
    });

    it('should exclude soft-deleted records', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      debtorRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAll({ page: 1, pageSize: 20 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('debtor.deletedAt IS NULL');
    });
  });

  describe('update', () => {
    describe('R-DBR-PROF-006: Updating profile and publishing event', () => {
      it('should successfully update a debtor profile', async () => {
        const updateDto = {
          firstName: 'Jane',
          lastName: 'Smith',
          middleName: 'B',
        };
        const freshProfile = { ...mockProfile };
        const updatedProfile = { ...freshProfile, ...updateDto };

        debtorRepository.findOne.mockResolvedValue(freshProfile);
        debtorRepository.save.mockResolvedValue(updatedProfile);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.update(mockProfileId, updateDto);

        expect(result).toEqual(updatedProfile);
        expect(debtorRepository.save).toHaveBeenCalled();
      });

      it('should publish DEBTORS_PROFILE_UPDATED event after update', async () => {
        const updateDto = {
          firstName: 'Jane',
        };
        const updatedProfile = { ...mockProfile, firstName: 'Jane' };

        debtorRepository.findOne.mockResolvedValue(mockProfile);
        debtorRepository.save.mockResolvedValue(updatedProfile);
        eventPublisher.publish.mockResolvedValue('');

        await service.update(mockProfileId, updateDto);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_PROFILE_UPDATED,
          expect.objectContaining({
            debtorId: mockProfileId,
            organizationId: mockOrgId,
            updatedFields: ['firstName'],
          }),
          DebtorUpdatedDto,
        );
      });

      it('should throw DebtorNotFoundException if debtor not found', async () => {
        debtorRepository.findOne.mockResolvedValue(null);

        await expect(
          service.update(mockProfileId, { firstName: 'Jane' }),
        ).rejects.toThrow(DebtorNotFoundException);
      });

      it('should enforce organization scoping on update', async () => {
        debtorRepository.findOne.mockResolvedValue(mockProfile);
        debtorRepository.save.mockResolvedValue(mockProfile);
        eventPublisher.publish.mockResolvedValue('');

        await service.update(mockProfileId, { firstName: 'Jane' });

        expect(debtorRepository.findOne).toHaveBeenCalledWith({
          where: { id: mockProfileId, organizationId: mockOrgId, deletedAt: IsNull() },
        });
      });
    });
  });

  describe('partialUpdate', () => {
    it('should update only provided fields', async () => {
      const partialUpdateDto = {
        firstName: 'Jane',
      };

      const freshProfile = { ...mockProfile };
      debtorRepository.findOne.mockResolvedValue(freshProfile);
      debtorRepository.save.mockResolvedValue({
        ...freshProfile,
        firstName: 'Jane',
      });
      eventPublisher.publish.mockResolvedValue('');

      const result = await service.partialUpdate(mockProfileId, partialUpdateDto);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Doe'); // Unchanged
    });

    it('should publish event with only updated fields', async () => {
      const partialUpdateDto = {
        notes: 'Updated notes',
      };

      debtorRepository.findOne.mockResolvedValue(mockProfile);
      debtorRepository.save.mockResolvedValue({
        ...mockProfile,
        notes: 'Updated notes',
      });
      eventPublisher.publish.mockResolvedValue('');

      await service.partialUpdate(mockProfileId, partialUpdateDto);

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTORS_PROFILE_UPDATED,
        expect.objectContaining({
          updatedFields: ['notes'],
        }),
        DebtorUpdatedDto,
      );
    });
  });

  describe('remove', () => {
    describe('R-DBR-PROF-007: Soft delete with deletedAt field', () => {
      it('should soft delete debtor by setting deletedAt timestamp', async () => {
        const updateResult = { affected: 1, raw: [], generatedMaps: [] };

        debtorRepository.findOne.mockResolvedValue(mockProfile);
        debtorRepository.update.mockResolvedValue(updateResult as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.remove(mockProfileId);

        expect(debtorRepository.update).toHaveBeenCalledWith(
          mockProfileId,
          expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        );
      });

      it('should publish DEBTORS_PROFILE_UPDATED event with deletedAt field', async () => {
        const updateResult = { affected: 1, raw: [], generatedMaps: [] };

        debtorRepository.findOne.mockResolvedValue(mockProfile);
        debtorRepository.update.mockResolvedValue(updateResult as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.remove(mockProfileId);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_PROFILE_UPDATED,
          expect.objectContaining({
            debtorId: mockProfileId,
            organizationId: mockOrgId,
            updatedFields: ['deletedAt'],
          }),
          DebtorUpdatedDto,
        );
      });

      it('should throw DebtorNotFoundException if debtor not found', async () => {
        debtorRepository.findOne.mockResolvedValue(null);

        await expect(service.remove(mockProfileId)).rejects.toThrow(
          DebtorNotFoundException,
        );
      });

      it('should enforce organization scoping on delete', async () => {
        const updateResult = { affected: 1, raw: [], generatedMaps: [] };

        debtorRepository.findOne.mockResolvedValue(mockProfile);
        debtorRepository.update.mockResolvedValue(updateResult as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.remove(mockProfileId);

        expect(debtorRepository.findOne).toHaveBeenCalledWith({
          where: { id: mockProfileId, organizationId: mockOrgId, deletedAt: IsNull() },
        });
      });
    });
  });

  describe('findOrCreateProfile', () => {
    describe('R-DBR-PROF-003: Preventing duplicate profiles for same identity + org', () => {
      it('should return existing profile if found', async () => {
        debtorRepository.findOne.mockResolvedValue(mockProfile);

        const result = await service.findOrCreateProfile(
          mockIdentityId,
          mockOrgId,
          {
            firstName: 'John',
            lastName: 'Doe',
          },
        );

        expect(result.profile).toEqual(mockProfile);
        expect(result.isNew).toBe(false);
        expect(debtorRepository.save).not.toHaveBeenCalled();
      });

      it('should create new profile if not found', async () => {
        debtorRepository.findOne.mockResolvedValue(null);
        debtorRepository.create.mockReturnValue(mockProfile);
        debtorRepository.save.mockResolvedValue(mockProfile);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.findOrCreateProfile(
          mockIdentityId,
          mockOrgId,
          {
            firstName: 'John',
            lastName: 'Doe',
          },
        );

        expect(result.profile).toEqual(mockProfile);
        expect(result.isNew).toBe(true);
        expect(debtorRepository.save).toHaveBeenCalled();
      });

      it('should check for exact identity + organization combination', async () => {
        debtorRepository.findOne.mockResolvedValue(null);
        debtorRepository.create.mockReturnValue(mockProfile);
        debtorRepository.save.mockResolvedValue(mockProfile);
        eventPublisher.publish.mockResolvedValue('');

        await service.findOrCreateProfile(mockIdentityId, mockOrgId, {
          firstName: 'John',
          lastName: 'Doe',
        });

        expect(debtorRepository.findOne).toHaveBeenCalledWith({
          where: {
            debtorIdentityId: mockIdentityId,
            organizationId: mockOrgId,
            deletedAt: IsNull(),
          },
        });
      });

      it('should publish event when creating new profile', async () => {
        debtorRepository.findOne.mockResolvedValue(null);
        debtorRepository.create.mockReturnValue(mockProfile);
        debtorRepository.save.mockResolvedValue(mockProfile);
        eventPublisher.publish.mockResolvedValue('');

        await service.findOrCreateProfile(mockIdentityId, mockOrgId, {
          firstName: 'John',
          lastName: 'Doe',
        });

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_PROFILE_CREATED,
          expect.objectContaining({
            profileId: mockProfileId,
            identityId: mockIdentityId,
            organizationId: mockOrgId,
          }),
          DebtorProfileCreatedDto,
        );
      });
    });
  });

  describe('Address delegation', () => {
    it('should delegate findAllAddresses to AddressService', async () => {
      const mockAddresses = [{ id: 'addr-1' }, { id: 'addr-2' }];
      addressService.findByProfile.mockResolvedValue(mockAddresses as any);

      const result = await service.findAllAddresses(mockProfileId);

      expect(result).toEqual(mockAddresses);
      expect(addressService.findByProfile).toHaveBeenCalledWith(
        mockProfileId,
        mockOrgId,
      );
    });

    it('should delegate createAddress to AddressService after ownership verification', async () => {
      const createAddressDto = {
        street1: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
      };
      const mockAddress = { id: 'addr-1', ...createAddressDto };

      debtorRepository.findOne.mockResolvedValue(mockProfile);
      addressService.create.mockResolvedValue(mockAddress as any);

      const result = await service.createAddress(mockProfileId, createAddressDto);

      expect(result).toEqual(mockAddress);
      expect(addressService.create).toHaveBeenCalledWith(
        mockProfileId,
        createAddressDto,
      );
    });
  });

  describe('Email delegation', () => {
    it('should delegate findAllEmails to EmailService', async () => {
      const mockEmails = [{ id: 'email-1' }, { id: 'email-2' }];
      emailService.findByProfile.mockResolvedValue(mockEmails as any);

      const result = await service.findAllEmails(mockProfileId);

      expect(result).toEqual(mockEmails);
      expect(emailService.findByProfile).toHaveBeenCalledWith(
        mockProfileId,
        mockOrgId,
      );
    });

    it('should delegate createEmail to EmailService after ownership verification', async () => {
      const createEmailDto = {
        email: 'john.doe@example.com',
      };
      const mockEmail = { id: 'email-1', ...createEmailDto };

      debtorRepository.findOne.mockResolvedValue(mockProfile);
      emailService.create.mockResolvedValue(mockEmail as any);

      const result = await service.createEmail(mockProfileId, createEmailDto);

      expect(result).toEqual(mockEmail);
      expect(emailService.create).toHaveBeenCalledWith(mockProfileId, createEmailDto);
    });
  });

  describe('Phone delegation', () => {
    it('should delegate findAllPhones to PhoneService', async () => {
      const mockPhones = [{ id: 'phone-1' }, { id: 'phone-2' }];
      phoneService.findByProfile.mockResolvedValue(mockPhones as any);

      const result = await service.findAllPhones(mockProfileId);

      expect(result).toEqual(mockPhones);
      expect(phoneService.findByProfile).toHaveBeenCalledWith(
        mockProfileId,
        mockOrgId,
      );
    });

    it('should delegate createPhone to PhoneService after ownership verification', async () => {
      const createPhoneDto = {
        phoneNumber: '555-123-4567',
      };
      const mockPhone = { id: 'phone-1', ...createPhoneDto };

      debtorRepository.findOne.mockResolvedValue(mockProfile);
      phoneService.create.mockResolvedValue(mockPhone as any);

      const result = await service.createPhone(mockProfileId, createPhoneDto);

      expect(result).toEqual(mockPhone);
      expect(phoneService.create).toHaveBeenCalledWith(
        mockProfileId,
        createPhoneDto,
      );
    });
  });

  describe('Organization context enforcement', () => {
    it('should throw error if organization context missing in findAll', async () => {
      requestContext.getOrgId.mockReturnValue(undefined);

      await expect(service.findAll({ page: 1, pageSize: 20 })).rejects.toThrow(
        'Organization context is required',
      );
    });

    it('should throw error if organization context missing in findOne', async () => {
      requestContext.getOrgId.mockReturnValue(undefined);

      await expect(service.findOne(mockProfileId)).rejects.toThrow(
        'Organization context is required',
      );
    });

    it('should throw error if organization context missing in update', async () => {
      requestContext.getOrgId.mockReturnValue(undefined);

      await expect(
        service.update(mockProfileId, { firstName: 'Jane' }),
      ).rejects.toThrow('Organization context is required');
    });
  });
});
