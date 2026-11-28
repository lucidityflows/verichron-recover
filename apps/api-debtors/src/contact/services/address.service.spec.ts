/**
 * DebtorAddressService Unit Tests
 *
 * SYSTEM RULES VALIDATED:
 * - R-DBR-CTCT-001: create() must successfully add new contact info to a DebtorProfile
 * - R-DBR-CTCT-002: update() must publish a DEBTORS_PROFILE_ADDRESS_UPDATED event
 * - R-DBR-CTCT-004: Setting a new primary contact must correctly demote the previous primary contact
 *
 * TESTING APPROACH:
 * - Unit tests in complete isolation
 * - All external dependencies (Repository, EventPublisher) are mocked
 * - Tests focus on service business logic, isPrimary handling, and event publishing
 */

import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { AddressCategory } from '@verichron/enums/dist';
import { DebtorAddressService } from './address.service';
import { DebtorAddress } from '../../profiles/entities/debtor-address.entity';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { DebtorAddressUpdatedDto } from '../../events/event-dto/debtors/debtor-address-updated.dto';

describe('DebtorAddressService', () => {
  let service: DebtorAddressService;
  let addressRepository: jest.Mocked<Repository<DebtorAddress>>;
  let profileRepository: jest.Mocked<Repository<DebtorProfileEntity>>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const mockProfileId = '550e8400-e29b-41d4-a716-446655440001';
  const mockOrgId = '550e8400-e29b-41d4-a716-446655440002';
  const mockAddressId = '550e8400-e29b-41d4-a716-446655440003';

  const mockAddress: any = {
    id: mockAddressId,
    debtorProfileId: mockProfileId,
    street1: '123 Main St',
    street2: 'Apt 4B',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62701',
    country: 'USA',
    addressCategory: AddressCategory.RESIDENCE_PRIMARY,
    isPrimary: false,
    isVerified: false,
    isCurrent: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProfile: any = {
    id: mockProfileId,
    organizationId: mockOrgId,
  };

  beforeEach(async () => {
    const mockAddressRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockProfileRepository = {
      findOne: jest.fn(),
    };

    const mockEventPublisher = {
      publish: jest.fn(),
    };

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        DebtorAddressService,
        {
          provide: getRepositoryToken(DebtorAddress),
          useValue: mockAddressRepository,
        },
        {
          provide: getRepositoryToken(DebtorProfileEntity),
          useValue: mockProfileRepository,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    service = module.get<DebtorAddressService>(DebtorAddressService);
    addressRepository = module.get(getRepositoryToken(DebtorAddress));
    profileRepository = module.get(getRepositoryToken(DebtorProfileEntity));
    eventPublisher = module.get(EventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    describe('R-DBR-CTCT-001: Creating new address', () => {
      it('should successfully create a new address', async () => {
        const addressData = {
          street1: '123 Main St',
          street2: 'Apt 4B',
          city: 'Springfield',
          state: 'IL',
          postalCode: '62701',
        };

        jest.spyOn(addressRepository, 'create').mockReturnValue(mockAddress);
        jest.spyOn(addressRepository, 'save').mockResolvedValue(mockAddress);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        const result = await service.create(mockProfileId, addressData);

        expect(result).toEqual(mockAddress);
        expect(addressRepository.create).toHaveBeenCalledWith({
          debtorProfileId: mockProfileId,
          street1: addressData.street1,
          street2: addressData.street2,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: 'USA',
          addressCategory: undefined,
          isPrimary: false,
        });
        expect(addressRepository.save).toHaveBeenCalledWith(mockAddress);
      });

      it('should use provided country if specified', async () => {
        const addressData = {
          street1: '123 Main St',
          city: 'Toronto',
          state: 'ON',
          postalCode: 'M5H 2N2',
          country: 'Canada',
        };

        jest.spyOn(addressRepository, 'create').mockReturnValue(mockAddress);
        jest.spyOn(addressRepository, 'save').mockResolvedValue(mockAddress);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.create(mockProfileId, addressData);

        expect(addressRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ country: 'Canada' }),
        );
      });
    });

    describe('R-DBR-CTCT-004: Setting primary address', () => {
      it('should unset existing primary when creating new primary address', async () => {
        const addressData = {
          street1: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          postalCode: '62701',
          isPrimary: true,
        };

        jest.spyOn(addressRepository, 'update').mockResolvedValue(undefined as any);
        jest.spyOn(addressRepository, 'create').mockReturnValue({ ...mockAddress, isPrimary: true });
        jest.spyOn(addressRepository, 'save').mockResolvedValue({ ...mockAddress, isPrimary: true });
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.create(mockProfileId, addressData);

        expect(addressRepository.update).toHaveBeenCalledWith(
          { debtorProfileId: mockProfileId, isPrimary: true },
          { isPrimary: false },
        );
      });
    });

    describe('R-DBR-CTCT-002: Publishing event', () => {
      it('should publish DebtorAddressUpdated event after creation', async () => {
        const addressData = {
          street1: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          postalCode: '62701',
        };

        jest.spyOn(addressRepository, 'create').mockReturnValue(mockAddress);
        jest.spyOn(addressRepository, 'save').mockResolvedValue(mockAddress);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.create(mockProfileId, addressData);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_PROFILE_ADDRESS_UPDATED,
          expect.objectContaining({
            debtorProfileId: mockProfileId,
            addressId: mockAddressId,
            organizationId: mockOrgId,
            isPrimary: false,
          }),
          DebtorAddressUpdatedDto,
        );
      });
    });
  });

  describe('findByProfile', () => {
    it('should return addresses using optimized query when organizationId provided', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockAddress]),
      };

      jest.spyOn(addressRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByProfile(mockProfileId, mockOrgId);

      expect(result).toEqual([mockAddress]);
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('address.debtorProfile', 'profile');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'address.debtorProfileId = :debtorProfileId',
        { debtorProfileId: mockProfileId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'profile.organizationId = :organizationId',
        { organizationId: mockOrgId },
      );
    });

    it('should return addresses using simple query when organizationId not provided', async () => {
      jest.spyOn(addressRepository, 'find').mockResolvedValue([mockAddress]);

      const result = await service.findByProfile(mockProfileId);

      expect(result).toEqual([mockAddress]);
      expect(addressRepository.find).toHaveBeenCalledWith({
        where: { debtorProfileId: mockProfileId },
        order: {
          isPrimary: 'DESC',
          createdAt: 'DESC',
        },
      });
    });
  });

  describe('findPrimary', () => {
    it('should return primary address for a profile', async () => {
      const primaryAddress = { ...mockAddress, isPrimary: true };
      jest.spyOn(addressRepository, 'findOne').mockResolvedValue(primaryAddress);

      const result = await service.findPrimary(mockProfileId);

      expect(result).toEqual(primaryAddress);
      expect(addressRepository.findOne).toHaveBeenCalledWith({
        where: { debtorProfileId: mockProfileId, isPrimary: true },
      });
    });

    it('should return null if no primary address exists', async () => {
      jest.spyOn(addressRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findPrimary(mockProfileId);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return address by ID', async () => {
      jest.spyOn(addressRepository, 'findOne').mockResolvedValue(mockAddress);

      const result = await service.findById(mockAddressId);

      expect(result).toEqual(mockAddress);
      expect(addressRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAddressId },
      });
    });
  });

  describe('update', () => {
    it('should successfully update an address', async () => {
      const updateData = { city: 'Chicago' };
      const updatedAddress = { ...mockAddress, city: 'Chicago' };

      jest.spyOn(addressRepository, 'findOne').mockResolvedValue(mockAddress);
      jest.spyOn(addressRepository, 'save').mockResolvedValue(updatedAddress);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      const result = await service.update(mockAddressId, updateData);

      expect(result).toEqual(updatedAddress);
      expect(addressRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if address not found', async () => {
      jest.spyOn(addressRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(mockAddressId, { city: 'Chicago' })).rejects.toThrow(
        NotFoundException,
      );
    });

    describe('R-DBR-CTCT-004: Setting primary address via update', () => {
      it('should unset existing primary when updating to primary', async () => {
        const updateData = { isPrimary: true };
        const updatedAddress = { ...mockAddress, isPrimary: true };

        jest.spyOn(addressRepository, 'findOne').mockResolvedValue(mockAddress);
        jest.spyOn(addressRepository, 'update').mockResolvedValue(undefined as any);
        jest.spyOn(addressRepository, 'save').mockResolvedValue(updatedAddress);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.update(mockAddressId, updateData);

        expect(addressRepository.update).toHaveBeenCalledWith(
          { debtorProfileId: mockProfileId, isPrimary: true },
          { isPrimary: false },
        );
      });

      it('should not unset primary if address is already primary', async () => {
        const primaryAddress = { ...mockAddress, isPrimary: true };
        const updateData = { city: 'Chicago' };

        jest.spyOn(addressRepository, 'findOne').mockResolvedValue(primaryAddress);
        jest.spyOn(addressRepository, 'update').mockResolvedValue(undefined as any);
        jest.spyOn(addressRepository, 'save').mockResolvedValue(primaryAddress);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.update(mockAddressId, updateData);

        expect(addressRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('R-DBR-CTCT-002: Publishing event on update', () => {
      it('should publish DebtorAddressUpdated event after update', async () => {
        const updateData = { city: 'Chicago' };
        const updatedAddress = { ...mockAddress, city: 'Chicago' };

        jest.spyOn(addressRepository, 'findOne').mockResolvedValue(mockAddress);
        jest.spyOn(addressRepository, 'save').mockResolvedValue(updatedAddress);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.update(mockAddressId, updateData);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_PROFILE_ADDRESS_UPDATED,
          expect.objectContaining({
            debtorProfileId: mockProfileId,
            addressId: mockAddressId,
            organizationId: mockOrgId,
          }),
          DebtorAddressUpdatedDto,
        );
      });
    });
  });

  describe('delete', () => {
    it('should successfully delete an address', async () => {
      jest.spyOn(addressRepository, 'findOne').mockResolvedValue(mockAddress);
      jest.spyOn(addressRepository, 'remove').mockResolvedValue(mockAddress);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.delete(mockAddressId);

      expect(addressRepository.remove).toHaveBeenCalledWith(mockAddress);
    });

    it('should throw NotFoundException if address not found', async () => {
      jest.spyOn(addressRepository, 'findOne').mockResolvedValue(null);

      await expect(service.delete(mockAddressId)).rejects.toThrow(NotFoundException);
    });

    it('should publish event after deletion', async () => {
      jest.spyOn(addressRepository, 'findOne').mockResolvedValue(mockAddress);
      jest.spyOn(addressRepository, 'remove').mockResolvedValue(mockAddress);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.delete(mockAddressId);

      expect(eventPublisher.publish).toHaveBeenCalled();
    });
  });

  describe('setPrimary', () => {
    describe('R-DBR-CTCT-004: Setting primary address', () => {
      it('should set address as primary and unset existing primary', async () => {
        const updateResult = { affected: 1, raw: [], generatedMaps: [] };
        const freshAddress = { ...mockAddress, isPrimary: false };

        addressRepository.findOne.mockResolvedValue(freshAddress);
        addressRepository.update.mockResolvedValue(updateResult as any);
        addressRepository.save.mockResolvedValue({ ...freshAddress, isPrimary: true });
        profileRepository.findOne.mockResolvedValue(mockProfile);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.setPrimary(mockAddressId);

        expect(result.isPrimary).toBe(true);
        expect(addressRepository.update).toHaveBeenCalledWith(
          { debtorProfileId: mockProfileId, isPrimary: true },
          { isPrimary: false },
        );
      });

      it('should return address unchanged if already primary', async () => {
        const primaryAddress = { ...mockAddress, isPrimary: true };
        jest.spyOn(addressRepository, 'findOne').mockResolvedValue(primaryAddress);

        const result = await service.setPrimary(mockAddressId);

        expect(result).toEqual(primaryAddress);
        expect(addressRepository.update).not.toHaveBeenCalled();
        expect(addressRepository.save).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException if address not found', async () => {
        jest.spyOn(addressRepository, 'findOne').mockResolvedValue(null);

        await expect(service.setPrimary(mockAddressId)).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Event Publishing', () => {
    it('should skip event publishing if profile not found', async () => {
      jest.spyOn(addressRepository, 'create').mockReturnValue(mockAddress);
      jest.spyOn(addressRepository, 'save').mockResolvedValue(mockAddress);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.create(mockProfileId, {
        street1: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
      });

      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });
  });
});
