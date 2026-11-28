/**
 * DebtorEmailService Unit Tests
 *
 * SYSTEM RULES VALIDATED:
 * - R-DBR-CTCT-001: create() must successfully add new contact info to a DebtorProfile
 * - R-DBR-CTCT-002: update() must publish a DEBTORS_PROFILE_EMAIL_UPDATED event
 * - R-DBR-CTCT-004: Setting a new primary contact must correctly demote the previous primary contact
 *
 * TESTING APPROACH:
 * - Unit tests in complete isolation
 * - All external dependencies (Repository, EventPublisher) are mocked
 * - Tests focus on service business logic, isPrimary handling, duplicate detection, and event publishing
 */

import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { EmailCategory } from '@verichron/enums/dist';
import { DebtorEmailService } from './email.service';
import { DebtorEmail } from '../../profiles/entities/debtor-email.entity';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { DuplicateEmailException } from '../../profiles/errors';
import { DebtorEmailUpdatedDto } from '../../events/event-dto/debtors/debtor-email-updated.dto';

describe('DebtorEmailService', () => {
  let service: DebtorEmailService;
  let emailRepository: jest.Mocked<Repository<DebtorEmail>>;
  let profileRepository: jest.Mocked<Repository<DebtorProfileEntity>>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const mockProfileId = '550e8400-e29b-41d4-a716-446655440001';
  const mockOrgId = '550e8400-e29b-41d4-a716-446655440002';
  const mockEmailId = '550e8400-e29b-41d4-a716-446655440003';

  const mockEmail: any = {
    id: mockEmailId,
    debtorProfileId: mockProfileId,
    email: 'john.doe@example.com',
    emailCategory: EmailCategory.GENERAL,
    isPrimary: false,
    isVerified: false,
    bounceStatus: 'UNKNOWN',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProfile: any = {
    id: mockProfileId,
    organizationId: mockOrgId,
  };

  beforeEach(async () => {
    const mockEmailRepository = {
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
        DebtorEmailService,
        {
          provide: getRepositoryToken(DebtorEmail),
          useValue: mockEmailRepository,
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

    service = module.get<DebtorEmailService>(DebtorEmailService);
    emailRepository = module.get(getRepositoryToken(DebtorEmail));
    profileRepository = module.get(getRepositoryToken(DebtorProfileEntity));
    eventPublisher = module.get(EventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    describe('R-DBR-CTCT-001: Creating new email', () => {
      it('should successfully create a new email', async () => {
        const emailData = {
          email: 'john.doe@example.com',
          emailCategory: EmailCategory.GENERAL,
        };

        jest.spyOn(emailRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(emailRepository, 'create').mockReturnValue(mockEmail);
        jest.spyOn(emailRepository, 'save').mockResolvedValue(mockEmail);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        const result = await service.create(mockProfileId, emailData);

        expect(result).toEqual(mockEmail);
        expect(emailRepository.create).toHaveBeenCalledWith({
          debtorProfileId: mockProfileId,
          email: 'john.doe@example.com',
          emailCategory: EmailCategory.GENERAL,
          isPrimary: false,
          isVerified: false,
        });
        expect(emailRepository.save).toHaveBeenCalledWith(mockEmail);
      });

      it('should normalize email to lowercase and trim', async () => {
        const emailData = {
          email: '  John.Doe@EXAMPLE.COM  ',
        };

        jest.spyOn(emailRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(emailRepository, 'create').mockReturnValue(mockEmail);
        jest.spyOn(emailRepository, 'save').mockResolvedValue(mockEmail);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.create(mockProfileId, emailData);

        expect(emailRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'john.doe@example.com' }),
        );
      });

      it('should throw ConflictException if email already exists for profile', async () => {
        const emailData = {
          email: 'john.doe@example.com',
        };

        jest.spyOn(emailRepository, 'findOne').mockResolvedValue(mockEmail);

        await expect(service.create(mockProfileId, emailData)).rejects.toThrow(DuplicateEmailException);
      });
    });

    describe('R-DBR-CTCT-004: Setting primary email', () => {
      it('should unset existing primary when creating new primary email', async () => {
        const emailData = {
          email: 'john.doe@example.com',
          isPrimary: true,
        };

        jest.spyOn(emailRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(emailRepository, 'update').mockResolvedValue(undefined as any);
        jest.spyOn(emailRepository, 'create').mockReturnValue({ ...mockEmail, isPrimary: true });
        jest.spyOn(emailRepository, 'save').mockResolvedValue({ ...mockEmail, isPrimary: true });
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.create(mockProfileId, emailData);

        expect(emailRepository.update).toHaveBeenCalledWith(
          { debtorProfileId: mockProfileId, isPrimary: true },
          { isPrimary: false },
        );
      });
    });

    describe('R-DBR-CTCT-002: Publishing event', () => {
      it('should publish DebtorEmailUpdated event after creation', async () => {
        const emailData = {
          email: 'john.doe@example.com',
        };

        jest.spyOn(emailRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(emailRepository, 'create').mockReturnValue(mockEmail);
        jest.spyOn(emailRepository, 'save').mockResolvedValue(mockEmail);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.create(mockProfileId, emailData);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_PROFILE_EMAIL_UPDATED,
          expect.objectContaining({
            debtorProfileId: mockProfileId,
            emailId: mockEmailId,
            organizationId: mockOrgId,
            isPrimary: false,
          }),
          DebtorEmailUpdatedDto,
        );
      });
    });
  });

  describe('findByProfile', () => {
    it('should return emails using optimized query when organizationId provided', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEmail]),
      };

      jest.spyOn(emailRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByProfile(mockProfileId, mockOrgId);

      expect(result).toEqual([mockEmail]);
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('email.debtorProfile', 'profile');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'email.debtorProfileId = :debtorProfileId',
        { debtorProfileId: mockProfileId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'profile.organizationId = :organizationId',
        { organizationId: mockOrgId },
      );
    });

    it('should return emails using simple query when organizationId not provided', async () => {
      jest.spyOn(emailRepository, 'find').mockResolvedValue([mockEmail]);

      const result = await service.findByProfile(mockProfileId);

      expect(result).toEqual([mockEmail]);
      expect(emailRepository.find).toHaveBeenCalledWith({
        where: { debtorProfileId: mockProfileId },
        order: {
          isPrimary: 'DESC',
          createdAt: 'DESC',
        },
      });
    });
  });

  describe('findPrimary', () => {
    it('should return primary email for a profile', async () => {
      const primaryEmail = { ...mockEmail, isPrimary: true };
      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(primaryEmail);

      const result = await service.findPrimary(mockProfileId);

      expect(result).toEqual(primaryEmail);
      expect(emailRepository.findOne).toHaveBeenCalledWith({
        where: { debtorProfileId: mockProfileId, isPrimary: true },
      });
    });

    it('should return null if no primary email exists', async () => {
      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findPrimary(mockProfileId);

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return email by ID', async () => {
      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(mockEmail);

      const result = await service.findById(mockEmailId);

      expect(result).toEqual(mockEmail);
      expect(emailRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEmailId },
      });
    });
  });

  describe('update', () => {
    it('should successfully update an email', async () => {
      const updateData = { emailCategory: EmailCategory.WORK };
      const updatedEmail = { ...mockEmail, emailCategory: EmailCategory.WORK };

      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(mockEmail);
      jest.spyOn(emailRepository, 'save').mockResolvedValue(updatedEmail);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      const result = await service.update(mockEmailId, updateData);

      expect(result).toEqual(updatedEmail);
      expect(emailRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if email not found', async () => {
      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(mockEmailId, { emailCategory: EmailCategory.WORK })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should check for duplicates when changing email address', async () => {
      const updateData = { email: 'new.email@example.com' };

      jest.spyOn(emailRepository, 'findOne')
        .mockResolvedValueOnce(mockEmail)
        .mockResolvedValueOnce(null);
      jest.spyOn(emailRepository, 'save').mockResolvedValue({ ...mockEmail, email: 'new.email@example.com' });
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.update(mockEmailId, updateData);

      expect(emailRepository.findOne).toHaveBeenCalledWith({
        where: {
          debtorProfileId: mockProfileId,
          email: 'new.email@example.com',
        },
      });
    });

    it('should throw ConflictException if new email already exists for profile', async () => {
      const updateData = { email: 'duplicate@example.com' };
      const duplicateEmail = { ...mockEmail, id: 'different-id', email: 'duplicate@example.com' };

      jest.spyOn(emailRepository, 'findOne')
        .mockResolvedValueOnce(mockEmail)
        .mockResolvedValueOnce(duplicateEmail);

      await expect(service.update(mockEmailId, updateData)).rejects.toThrow(DuplicateEmailException);
    });

    describe('R-DBR-CTCT-004: Setting primary email via update', () => {
      it('should unset existing primary when updating to primary', async () => {
        const updateData = { isPrimary: true };
        const updatedEmail = { ...mockEmail, isPrimary: true };

        jest.spyOn(emailRepository, 'findOne').mockResolvedValue(mockEmail);
        jest.spyOn(emailRepository, 'update').mockResolvedValue(undefined as any);
        jest.spyOn(emailRepository, 'save').mockResolvedValue(updatedEmail);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.update(mockEmailId, updateData);

        expect(emailRepository.update).toHaveBeenCalledWith(
          { debtorProfileId: mockProfileId, isPrimary: true },
          { isPrimary: false },
        );
      });

      it('should not unset primary if email is already primary', async () => {
        const primaryEmail = { ...mockEmail, isPrimary: true };
        const updateData = { emailCategory: EmailCategory.WORK };

        jest.spyOn(emailRepository, 'findOne').mockResolvedValue(primaryEmail);
        jest.spyOn(emailRepository, 'update').mockResolvedValue(undefined as any);
        jest.spyOn(emailRepository, 'save').mockResolvedValue(primaryEmail);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.update(mockEmailId, updateData);

        expect(emailRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('R-DBR-CTCT-002: Publishing event on update', () => {
      it('should publish DebtorEmailUpdated event after update', async () => {
        const updateData = { emailCategory: EmailCategory.WORK };
        const updatedEmail = { ...mockEmail, emailCategory: EmailCategory.WORK };

        jest.spyOn(emailRepository, 'findOne').mockResolvedValue(mockEmail);
        jest.spyOn(emailRepository, 'save').mockResolvedValue(updatedEmail);
        jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
        jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

        await service.update(mockEmailId, updateData);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_PROFILE_EMAIL_UPDATED,
          expect.objectContaining({
            debtorProfileId: mockProfileId,
            emailId: mockEmailId,
            organizationId: mockOrgId,
          }),
          DebtorEmailUpdatedDto,
        );
      });
    });
  });

  describe('delete', () => {
    it('should successfully delete an email', async () => {
      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(mockEmail);
      jest.spyOn(emailRepository, 'remove').mockResolvedValue(mockEmail);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.delete(mockEmailId);

      expect(emailRepository.remove).toHaveBeenCalledWith(mockEmail);
    });

    it('should throw NotFoundException if email not found', async () => {
      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(null);

      await expect(service.delete(mockEmailId)).rejects.toThrow(NotFoundException);
    });

    it('should publish event after deletion', async () => {
      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(mockEmail);
      jest.spyOn(emailRepository, 'remove').mockResolvedValue(mockEmail);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.delete(mockEmailId);

      expect(eventPublisher.publish).toHaveBeenCalled();
    });
  });

  describe('setPrimary', () => {
    describe('R-DBR-CTCT-004: Setting primary email', () => {
      it('should set email as primary and unset existing primary', async () => {
        const updateResult = { affected: 1, raw: [], generatedMaps: [] };
        const freshEmail = { ...mockEmail, isPrimary: false };

        emailRepository.findOne.mockResolvedValue(freshEmail);
        emailRepository.update.mockResolvedValue(updateResult as any);
        emailRepository.save.mockResolvedValue({ ...freshEmail, isPrimary: true });
        profileRepository.findOne.mockResolvedValue(mockProfile);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.setPrimary(mockEmailId);

        expect(result.isPrimary).toBe(true);
        expect(emailRepository.update).toHaveBeenCalledWith(
          { debtorProfileId: mockProfileId, isPrimary: true },
          { isPrimary: false },
        );
      });

      it('should return email unchanged if already primary', async () => {
        const primaryEmail = { ...mockEmail, isPrimary: true };
        jest.spyOn(emailRepository, 'findOne').mockResolvedValue(primaryEmail);

        const result = await service.setPrimary(mockEmailId);

        expect(result).toEqual(primaryEmail);
        expect(emailRepository.update).not.toHaveBeenCalled();
        expect(emailRepository.save).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException if email not found', async () => {
        jest.spyOn(emailRepository, 'findOne').mockResolvedValue(null);

        await expect(service.setPrimary(mockEmailId)).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('markVerified', () => {
    it('should mark email as verified with default timestamp', async () => {
      const verifiedEmail = { ...mockEmail, isVerified: true, verifiedAt: expect.any(Date) };

      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(mockEmail);
      jest.spyOn(emailRepository, 'save').mockResolvedValue(verifiedEmail);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      const result = await service.markVerified(mockEmailId);

      expect(result.isVerified).toBe(true);
      expect(result.verifiedAt).toBeDefined();
    });

    it('should mark email as verified with provided timestamp', async () => {
      const verifiedAt = new Date('2024-02-01');
      const verifiedEmail = { ...mockEmail, isVerified: true, verifiedAt };

      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(mockEmail);
      jest.spyOn(emailRepository, 'save').mockResolvedValue(verifiedEmail);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      const result = await service.markVerified(mockEmailId, verifiedAt);

      expect(result.verifiedAt).toEqual(verifiedAt);
    });

    it('should throw NotFoundException if email not found', async () => {
      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(null);

      await expect(service.markVerified(mockEmailId)).rejects.toThrow(NotFoundException);
    });

    it('should publish event after verification', async () => {
      const verifiedEmail = { ...mockEmail, isVerified: true, verifiedAt: new Date() };

      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(mockEmail);
      jest.spyOn(emailRepository, 'save').mockResolvedValue(verifiedEmail);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.markVerified(mockEmailId);

      expect(eventPublisher.publish).toHaveBeenCalled();
    });
  });

  describe('Event Publishing', () => {
    it('should skip event publishing if profile not found', async () => {
      jest.spyOn(emailRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(emailRepository, 'create').mockReturnValue(mockEmail);
      jest.spyOn(emailRepository, 'save').mockResolvedValue(mockEmail);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(eventPublisher, 'publish').mockResolvedValue('');

      await service.create(mockProfileId, { email: 'john.doe@example.com' });

      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });
  });
});
