/**
 * DebtorPhoneService Unit Tests
 *
 * SYSTEM RULES VALIDATED:
 * - R-DBR-CTCT-001: create() must successfully add new contact info to a DebtorProfile
 * - R-DBR-CTCT-002: update() must publish a DEBTORS_PROFILE_PHONE_UPDATED event
 * - R-DBR-CTCT-004: Setting a new primary contact must correctly demote the previous primary contact
 *
 * TESTING APPROACH:
 * - Unit tests in complete isolation
 * - All external dependencies (Repository, EventPublisher) are mocked
 * - Tests focus on service business logic, isPrimary handling, duplicate detection, phone normalization, and event publishing
 */

import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { PhoneCategory } from '@verichron/enums/dist';
import { DebtorPhoneService } from './phone.service';
import { DebtorPhone } from '../../profiles/entities/debtor-phone.entity';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { DebtorPhoneUpdatedDto } from '../../events/event-dto/debtors/debtor-phone-updated.dto';

describe('DebtorPhoneService', () => {
  let service: DebtorPhoneService;
  let phoneRepository: jest.Mocked<Repository<DebtorPhone>>;
  let profileRepository: jest.Mocked<Repository<DebtorProfileEntity>>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const mockProfileId = '550e8400-e29b-41d4-a716-446655440001';
  const mockOrgId = '550e8400-e29b-41d4-a716-446655440002';
  const mockPhoneId = '550e8400-e29b-41d4-a716-446655440003';

  const mockPhone: any = {
    id: mockPhoneId,
    debtorProfileId: mockProfileId,
    phoneNumber: '5551234567',
    category: PhoneCategory.MOBILE,
    isPrimary: false,
    isVerified: false,
    canReceiveSms: false,
    canReceiveCalls: true,
    isOptedOut: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProfile: any = {
    id: mockProfileId,
    organizationId: mockOrgId,
  };

  beforeEach(async () => {
    const mockPhoneRepository = {
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
        DebtorPhoneService,
        {
          provide: getRepositoryToken(DebtorPhone),
          useValue: mockPhoneRepository,
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

    service = module.get<DebtorPhoneService>(DebtorPhoneService);
    phoneRepository = module.get(getRepositoryToken(DebtorPhone));
    profileRepository = module.get(getRepositoryToken(DebtorProfileEntity));
    eventPublisher = module.get(EventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    describe('R-DBR-CTCT-001: Creating new phone', () => {
      it('should successfully create a new phone', async () => {
        const phoneData = {
          phoneNumber: '555-123-4567',
          category: PhoneCategory.MOBILE,
        };

        jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(phoneRepository, 'create').mockReturnValue(mockPhone);
        jest.spyOn(phoneRepository, 'save').mockResolvedValue(mockPhone);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        const result = await service.create(mockProfileId, phoneData);

        expect(result).toEqual(mockPhone);
        expect(phoneRepository.create).toHaveBeenCalledWith({
          debtorProfileId: mockProfileId,
          phoneNumber: '5551234567',
          category: PhoneCategory.MOBILE,
          isPrimary: false,
          isVerified: false,
        });
        expect(phoneRepository.save).toHaveBeenCalledWith(mockPhone);
      });

      it('should normalize phone number by removing non-digits', async () => {
        const phoneData = {
          phoneNumber: '+1 (555) 123-4567',
        };

        jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(phoneRepository, 'create').mockReturnValue(mockPhone);
        jest.spyOn(phoneRepository, 'save').mockResolvedValue(mockPhone);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.create(mockProfileId, phoneData);

        expect(phoneRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ phoneNumber: '15551234567' }),
        );
      });

      it('should throw ConflictException if phone already exists for profile', async () => {
        const phoneData = {
          phoneNumber: '555-123-4567',
        };

        jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(mockPhone);

        await expect(service.create(mockProfileId, phoneData)).rejects.toThrow(ConflictException);
      });
    });

    describe('R-DBR-CTCT-004: Setting primary phone', () => {
      it('should unset existing primary when creating new primary phone', async () => {
        const phoneData = {
          phoneNumber: '555-123-4567',
          isPrimary: true,
        };

        jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(phoneRepository, 'update').mockResolvedValue(undefined as any);
        jest.spyOn(phoneRepository, 'create').mockReturnValue({ ...mockPhone, isPrimary: true });
        jest.spyOn(phoneRepository, 'save').mockResolvedValue({ ...mockPhone, isPrimary: true });
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.create(mockProfileId, phoneData);

        expect(phoneRepository.update).toHaveBeenCalledWith(
          { debtorProfileId: mockProfileId, isPrimary: true },
          { isPrimary: false },
        );
      });
    });

    describe('R-DBR-CTCT-002: Publishing event', () => {
      it('should publish DebtorPhoneUpdated event after creation', async () => {
        const phoneData = {
          phoneNumber: '555-123-4567',
        };

        jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(phoneRepository, 'create').mockReturnValue(mockPhone);
        jest.spyOn(phoneRepository, 'save').mockResolvedValue(mockPhone);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.create(mockProfileId, phoneData);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_PROFILE_PHONE_UPDATED,
          expect.objectContaining({
            debtorProfileId: mockProfileId,
            phoneId: mockPhoneId,
            organizationId: mockOrgId,
            isPrimary: false,
          }),
          DebtorPhoneUpdatedDto,
        );
      });
    });
  });

  describe('findByProfile', () => {
    it('should return phones using optimized query when organizationId provided', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPhone]),
      };

      jest.spyOn(phoneRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByProfile(mockProfileId, mockOrgId);

      expect(result).toEqual([mockPhone]);
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('phone.debtorProfile', 'profile');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'phone.debtorProfileId = :debtorProfileId',
        { debtorProfileId: mockProfileId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'profile.organizationId = :organizationId',
        { organizationId: mockOrgId },
      );
    });

    it('should return phones using simple query when organizationId not provided', async () => {
      jest.spyOn(phoneRepository, 'find').mockResolvedValue([mockPhone]);

      const result = await service.findByProfile(mockProfileId);

      expect(result).toEqual([mockPhone]);
      expect(phoneRepository.find).toHaveBeenCalledWith({
        where: { debtorProfileId: mockProfileId },
        order: {
          isPrimary: 'DESC',
          createdAt: 'DESC',
        },
      });
    });
  });

  describe('findPrimary', () => {
    it('should return primary phone for a profile', async () => {
      const primaryPhone = { ...mockPhone, isPrimary: true };
      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(primaryPhone);

      const result = await service.findPrimary(mockProfileId);

      expect(result).toEqual(primaryPhone);
      expect(phoneRepository.findOne).toHaveBeenCalledWith({
        where: { debtorProfileId: mockProfileId, isPrimary: true },
      });
    });

    it('should return null if no primary phone exists', async () => {
      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findPrimary(mockProfileId);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return phone by ID', async () => {
      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(mockPhone);

      const result = await service.findById(mockPhoneId);

      expect(result).toEqual(mockPhone);
      expect(phoneRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPhoneId },
      });
    });
  });

  describe('update', () => {
    it('should successfully update a phone', async () => {
      const updateData = { category: PhoneCategory.WORK };
      const updatedPhone = { ...mockPhone, category: PhoneCategory.WORK };

      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(mockPhone);
      jest.spyOn(phoneRepository, 'save').mockResolvedValue(updatedPhone);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      const result = await service.update(mockPhoneId, updateData);

      expect(result).toEqual(updatedPhone);
      expect(phoneRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if phone not found', async () => {
      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(mockPhoneId, { category: PhoneCategory.WORK })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should normalize and check for duplicates when changing phone number', async () => {
      const updateData = { phoneNumber: '+1 (555) 999-8888' };

      jest.spyOn(phoneRepository, 'findOne')
        .mockResolvedValueOnce(mockPhone)
        .mockResolvedValueOnce(null);
      jest.spyOn(phoneRepository, 'save').mockResolvedValue({ ...mockPhone, phoneNumber: '15559998888' });
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.update(mockPhoneId, updateData);

      expect(phoneRepository.findOne).toHaveBeenCalledWith({
        where: {
          debtorProfileId: mockProfileId,
          phoneNumber: '15559998888',
        },
      });
    });

    it('should not check duplicates if phone number unchanged', async () => {
      const updateData = { category: PhoneCategory.WORK };

      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(mockPhone);
      jest.spyOn(phoneRepository, 'save').mockResolvedValue({ ...mockPhone, category: PhoneCategory.WORK });
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      const result = await service.update(mockPhoneId, updateData);

      // Should not check for duplicates since phone number not changed
      expect(result.category).toBe(PhoneCategory.WORK);
      expect(phoneRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if new phone already exists for profile', async () => {
      const updateData = { phoneNumber: '555-999-8888' };
      const duplicatePhone = { ...mockPhone, id: 'different-id', phoneNumber: '5559998888' };

      jest.spyOn(phoneRepository, 'findOne')
        .mockResolvedValueOnce(mockPhone)
        .mockResolvedValueOnce(duplicatePhone);

      await expect(service.update(mockPhoneId, updateData)).rejects.toThrow(ConflictException);
    });

    describe('R-DBR-CTCT-004: Setting primary phone via update', () => {
      it('should unset existing primary when updating to primary', async () => {
        const updateData = { isPrimary: true };
        const updatedPhone = { ...mockPhone, isPrimary: true };

        jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(mockPhone);
        jest.spyOn(phoneRepository, 'update').mockResolvedValue(undefined as any);
        jest.spyOn(phoneRepository, 'save').mockResolvedValue(updatedPhone);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.update(mockPhoneId, updateData);

        expect(phoneRepository.update).toHaveBeenCalledWith(
          { debtorProfileId: mockProfileId, isPrimary: true },
          { isPrimary: false },
        );
      });

      it('should not unset primary if phone is already primary', async () => {
        const primaryPhone = { ...mockPhone, isPrimary: true };
        const updateData = { category: PhoneCategory.WORK };

        jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(primaryPhone);
        jest.spyOn(phoneRepository, 'update').mockResolvedValue(undefined as any);
        jest.spyOn(phoneRepository, 'save').mockResolvedValue(primaryPhone);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.update(mockPhoneId, updateData);

        expect(phoneRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('R-DBR-CTCT-002: Publishing event on update', () => {
      it('should publish DebtorPhoneUpdated event after update', async () => {
        const updateData = { category: PhoneCategory.WORK };
        const updatedPhone = { ...mockPhone, category: PhoneCategory.WORK };

        jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(mockPhone);
        jest.spyOn(phoneRepository, 'save').mockResolvedValue(updatedPhone);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.update(mockPhoneId, updateData);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_PROFILE_PHONE_UPDATED,
          expect.objectContaining({
            debtorProfileId: mockProfileId,
            phoneId: mockPhoneId,
            organizationId: mockOrgId,
          }),
          DebtorPhoneUpdatedDto,
        );
      });
    });
  });

  describe('delete', () => {
    it('should successfully delete a phone', async () => {
      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(mockPhone);
      jest.spyOn(phoneRepository, 'remove').mockResolvedValue(mockPhone);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.delete(mockPhoneId);

      expect(phoneRepository.remove).toHaveBeenCalledWith(mockPhone);
    });

    it('should throw NotFoundException if phone not found', async () => {
      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(null);

      await expect(service.delete(mockPhoneId)).rejects.toThrow(NotFoundException);
    });

    it('should publish event after deletion', async () => {
      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(mockPhone);
      jest.spyOn(phoneRepository, 'remove').mockResolvedValue(mockPhone);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.delete(mockPhoneId);

      expect(eventPublisher.publish).toHaveBeenCalled();
    });
  });

  describe('setPrimary', () => {
    describe('R-DBR-CTCT-004: Setting primary phone', () => {
      it('should set phone as primary and unset existing primary', async () => {
        const updateResult = { affected: 1, raw: [], generatedMaps: [] };
        const freshPhone = { ...mockPhone, isPrimary: false };

        phoneRepository.findOne.mockResolvedValue(freshPhone);
        phoneRepository.update.mockResolvedValue(updateResult as any);
        phoneRepository.save.mockResolvedValue({ ...freshPhone, isPrimary: true });
        profileRepository.findOne.mockResolvedValue(mockProfile);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.setPrimary(mockPhoneId);

        expect(result.isPrimary).toBe(true);
        expect(phoneRepository.update).toHaveBeenCalledWith(
          { debtorProfileId: mockProfileId, isPrimary: true },
          { isPrimary: false },
        );
      });

      it('should return phone unchanged if already primary', async () => {
        const primaryPhone = { ...mockPhone, isPrimary: true };
        jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(primaryPhone);

        const result = await service.setPrimary(mockPhoneId);

        expect(result).toEqual(primaryPhone);
        expect(phoneRepository.update).not.toHaveBeenCalled();
        expect(phoneRepository.save).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException if phone not found', async () => {
        jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(null);

        await expect(service.setPrimary(mockPhoneId)).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('markVerified', () => {
    it('should mark phone as verified with default timestamp', async () => {
      const verifiedPhone = { ...mockPhone, isVerified: true, verifiedAt: expect.any(Date) };

      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(mockPhone);
      jest.spyOn(phoneRepository, 'save').mockResolvedValue(verifiedPhone);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      const result = await service.markVerified(mockPhoneId);

      expect(result.isVerified).toBe(true);
      expect(result.verifiedAt).toBeDefined();
    });

    it('should mark phone as verified with provided timestamp', async () => {
      const verifiedAt = new Date('2024-02-01');
      const verifiedPhone = { ...mockPhone, isVerified: true, verifiedAt };

      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(mockPhone);
      jest.spyOn(phoneRepository, 'save').mockResolvedValue(verifiedPhone);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      const result = await service.markVerified(mockPhoneId, verifiedAt);

      expect(result.verifiedAt).toEqual(verifiedAt);
    });

    it('should throw NotFoundException if phone not found', async () => {
      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(null);

      await expect(service.markVerified(mockPhoneId)).rejects.toThrow(NotFoundException);
    });

    it('should publish event after verification', async () => {
      const verifiedPhone = { ...mockPhone, isVerified: true, verifiedAt: new Date() };

      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(mockPhone);
      jest.spyOn(phoneRepository, 'save').mockResolvedValue(verifiedPhone);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.markVerified(mockPhoneId);

      expect(eventPublisher.publish).toHaveBeenCalled();
    });
  });

  describe('Event Publishing', () => {
    it('should skip event publishing if profile not found', async () => {
      jest.spyOn(phoneRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(phoneRepository, 'create').mockReturnValue(mockPhone);
      jest.spyOn(phoneRepository, 'save').mockResolvedValue(mockPhone);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.create(mockProfileId, { phoneNumber: '555-123-4567' });

      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });
  });
});
