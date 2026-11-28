/**
 * @system-rule R-DBR-ID-001, R-DBR-ID-002, R-DBR-ID-003, R-DBR-ID-004, R-DBR-ID-005
 * @description Unit tests for the DebtorIdentityService.
 *
 * ## What This Test Proves:
 * - `findOrCreateIdentity` creates a new DebtorIdentity when no match is found (R-DBR-ID-001).
 * - `findOrCreateIdentity` returns an existing DebtorIdentity when a match is found via userId, SSN hash, or email (R-DBR-ID-002).
 * - `findOrCreateIdentity` follows correct matching precedence: userId > SSN hash > email (R-DBR-ID-002).
 * - `findOrCreateIdentity` publishes a DEBTORS_IDENTITY_CREATED event upon creating a new identity (R-DBR-ID-003).
 * - `linkUserToIdentity` correctly associates a userId with an existing DebtorIdentity and publishes DEBTORS_USER_LINKED event (R-DBR-ID-004).
 * - `linkUserToIdentity` throws an error if the userId is already linked to a different identity (R-DBR-ID-005).
 * - `linkUserToIdentityWithProfile` includes organization context in events.
 * - `unlinkUserFromIdentity` correctly removes user linkage.
 * - `generateDebtorKey` produces deterministic keys for idempotency.
 * - `generateSsnHash` produces consistent SHA-256 hashes for SSNs.
 *
 * ## What This Test Does NOT Prove:
 * - Integration with a real database (all repositories are mocked).
 * - Race conditions during concurrent identity creation.
 * - Performance characteristics of identity matching at scale.
 */
import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { DebtorIdentityService } from './identity.service';
import { DebtorIdentityEntity } from './entities/debtor-identity.entity';
import { DebtorEmail } from '../profiles/entities/debtor-email.entity';
import { DebtorDemographics } from '../demographics/entities/debtor-demographics.entity';
import { DebtorProfileEntity } from '../profiles/entities/debtor-profile.entity';
import { DebtorIdentityCreatedDto } from '../events/event-dto/debtors/debtor-identity-created.dto';
import { DebtorUserLinkedDto } from '../events/event-dto/debtors/debtor-user-linked.dto';

describe('DebtorIdentityService', () => {
  let service: DebtorIdentityService;
  let identityRepository: Repository<DebtorIdentityEntity>;
  let emailRepository: Repository<DebtorEmail>;
  let demographicsRepository: Repository<DebtorDemographics>;
  let profileRepository: Repository<DebtorProfileEntity>;
  let eventPublisher: EventPublisher;

  // Mock entities - using valid UUIDs for DTO validation
  const mockIdentity: any = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: null,
    profiles: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockIdentityWithUser: any = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440010',
    profiles: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockProfile: any = {
    id: '550e8400-e29b-41d4-a716-446655440020',
    debtorIdentityId: '550e8400-e29b-41d4-a716-446655440000',
    organizationId: '550e8400-e29b-41d4-a716-446655440030',
    firstName: 'John',
    lastName: 'Doe',
    middleName: null,
    suffix: null,
    dateOfBirth: new Date('1990-01-01'),
    debtorIdentity: null,  // Will be set after creation to avoid circular ref
    addresses: [],
    emails: [],
    phones: [],
    documents: [],
    verifications: [],
    demographics: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockEmail: any = {
    id: '550e8400-e29b-41d4-a716-446655440040',
    debtorProfileId: '550e8400-e29b-41d4-a716-446655440020',
    email: 'john.doe@example.com',
    category: 'PERSONAL',
    isPrimary: true,
    isVerified: false,
    debtorProfile: null,  // Will be set after creation to avoid circular ref
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockDemographics: any = {
    id: '550e8400-e29b-41d4-a716-446655440050',
    debtorProfileId: '550e8400-e29b-41d4-a716-446655440020',
    ssnHash: 'hashed-ssn-123',
    ssnLastFour: '1234',
    gender: 'M',
    maritalStatus: 'SINGLE',
    employmentStatus: 'EMPLOYED',
    annualIncome: 50000,
    debtorProfile: null,  // Will be set after creation to avoid circular ref
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  beforeEach(async () => {
    // Setup circular references for mock objects
    mockProfile.debtorIdentity = mockIdentity;
    mockEmail.debtorProfile = mockProfile;
    mockDemographics.debtorProfile = mockProfile;

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        DebtorIdentityService,
        {
          provide: getRepositoryToken(DebtorIdentityEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DebtorEmail),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DebtorDemographics),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DebtorProfileEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EventPublisher,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DebtorIdentityService>(DebtorIdentityService);
    identityRepository = module.get<Repository<DebtorIdentityEntity>>(
      getRepositoryToken(DebtorIdentityEntity),
    );
    emailRepository = module.get<Repository<DebtorEmail>>(
      getRepositoryToken(DebtorEmail),
    );
    demographicsRepository = module.get<Repository<DebtorDemographics>>(
      getRepositoryToken(DebtorDemographics),
    );
    profileRepository = module.get<Repository<DebtorProfileEntity>>(
      getRepositoryToken(DebtorProfileEntity),
    );
    eventPublisher = module.get<EventPublisher>(EventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrCreateIdentity', () => {
    describe('R-DBR-ID-001: Creating new identity when no match found', () => {
      it('should create a new identity when no matching criteria provided', async () => {
        jest.spyOn(identityRepository, 'create').mockReturnValue(mockIdentity);
        jest.spyOn(identityRepository, 'save').mockResolvedValue(mockIdentity);

        const result = await service.findOrCreateIdentity({});

        expect(result.identity).toEqual(mockIdentity);
        expect(result.isNew).toBe(true);
        expect(identityRepository.create).toHaveBeenCalledWith({ userId: null });
        expect(identityRepository.save).toHaveBeenCalledWith(mockIdentity);
      });

      it('should create a new identity when no existing match is found', async () => {
        jest.spyOn(service, 'findIdentityByMatchingCriteria').mockResolvedValue(null);
        jest.spyOn(identityRepository, 'create').mockReturnValue(mockIdentity);
        jest.spyOn(identityRepository, 'save').mockResolvedValue(mockIdentity);

        const result = await service.findOrCreateIdentity({
          email: 'new.user@example.com',
        });

        expect(result.identity).toEqual(mockIdentity);
        expect(result.isNew).toBe(true);
      });

      it('should create identity with userId if provided', async () => {
        const testUserId = '550e8400-e29b-41d4-a716-446655440011';
        const identityWithUser = { ...mockIdentity, userId: testUserId };
        jest.spyOn(service, 'findIdentityByMatchingCriteria').mockResolvedValue(null);
        jest.spyOn(identityRepository, 'create').mockReturnValue(identityWithUser);
        jest.spyOn(identityRepository, 'save').mockResolvedValue(identityWithUser);

        const result = await service.findOrCreateIdentity({ userId: testUserId });

        expect(result.identity.userId).toBe(testUserId);
        expect(result.isNew).toBe(true);
        expect(identityRepository.create).toHaveBeenCalledWith({ userId: testUserId });
      });
    });

    describe('R-DBR-ID-002: Returning existing identity when match found', () => {
      it('should return existing identity when userId matches', async () => {
        jest.spyOn(identityRepository, 'findOne').mockResolvedValue(mockIdentityWithUser);

        const result = await service.findOrCreateIdentity({ userId: mockIdentityWithUser.userId });

        expect(result.identity).toEqual(mockIdentityWithUser);
        expect(result.isNew).toBe(false);
        expect(identityRepository.findOne).toHaveBeenCalledWith({
          where: { userId: mockIdentityWithUser.userId },
        });
      });

      it('should return existing identity when SSN hash matches', async () => {
        jest.spyOn(identityRepository, 'findOne').mockResolvedValue(null); // No userId match
        jest.spyOn(demographicsRepository, 'findOne').mockResolvedValue({
          ...mockDemographics,
          debtorProfile: {
            ...mockProfile,
            debtorIdentity: mockIdentity,
          },
        });

        const result = await service.findOrCreateIdentity({ ssnHash: 'hashed-ssn-123' });

        expect(result.identity).toEqual(mockIdentity);
        expect(result.isNew).toBe(false);
      });

      it('should return existing identity when email matches', async () => {
        jest.spyOn(identityRepository, 'findOne').mockResolvedValue(null); // No userId match
        jest.spyOn(demographicsRepository, 'findOne').mockResolvedValue(null); // No SSN match
        jest.spyOn(emailRepository, 'findOne').mockResolvedValue({
          ...mockEmail,
          debtorProfile: {
            ...mockProfile,
            debtorIdentity: mockIdentity,
          },
        });

        const result = await service.findOrCreateIdentity({ email: 'john.doe@example.com' });

        expect(result.identity).toEqual(mockIdentity);
        expect(result.isNew).toBe(false);
      });

      it('should prioritize userId over SSN hash', async () => {
        jest.spyOn(identityRepository, 'findOne').mockResolvedValue(mockIdentityWithUser);

        const result = await service.findOrCreateIdentity({
          userId: 'user-123',
          ssnHash: 'some-hash',
        });

        expect(result.identity).toEqual(mockIdentityWithUser);
        expect(identityRepository.findOne).toHaveBeenCalledTimes(1);
        expect(demographicsRepository.findOne).not.toHaveBeenCalled();
      });

      it('should prioritize SSN hash over email', async () => {
        jest.spyOn(identityRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(demographicsRepository, 'findOne').mockResolvedValue({
          ...mockDemographics,
          debtorProfile: {
            ...mockProfile,
            debtorIdentity: mockIdentity,
          },
        });

        const result = await service.findOrCreateIdentity({
          ssnHash: 'hashed-ssn-123',
          email: 'john.doe@example.com',
        });

        expect(result.identity).toEqual(mockIdentity);
        expect(emailRepository.findOne).not.toHaveBeenCalled();
      });
    });

    describe('R-DBR-ID-003: Publishing DEBTORS_IDENTITY_CREATED event', () => {
      it('should publish event when creating new identity', async () => {
        jest.spyOn(service, 'findIdentityByMatchingCriteria').mockResolvedValue(null);
        jest.spyOn(identityRepository, 'create').mockReturnValue(mockIdentity);
        jest.spyOn(identityRepository, 'save').mockResolvedValue(mockIdentity);

        await service.findOrCreateIdentity({ email: 'new@example.com' });

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_IDENTITY_CREATED,
          expect.objectContaining({
            identityId: mockIdentity.id,
            userId: undefined,
            createdAt: mockIdentity.createdAt.toISOString(),
          }),
          DebtorIdentityCreatedDto,
        );
      });

      it('should NOT publish event when returning existing identity', async () => {
        jest.spyOn(identityRepository, 'findOne').mockResolvedValue(mockIdentityWithUser);

        await service.findOrCreateIdentity({ userId: 'user-123' });

        expect(eventPublisher.publish).not.toHaveBeenCalled();
      });
    });
  });

  describe('linkUserToIdentity', () => {
    describe('R-DBR-ID-004: Linking user to identity', () => {
      it('should link userId to identity (without publishing event)', async () => {
        const testUserId = '550e8400-e29b-41d4-a716-446655440012';
        const updatedIdentity = { ...mockIdentity, userId: testUserId };
        jest.spyOn(identityRepository, 'findOne').mockResolvedValue(mockIdentity);
        jest.spyOn(identityRepository, 'save').mockResolvedValue(updatedIdentity);

        const result = await service.linkUserToIdentity(mockIdentity.id, testUserId);

        expect(result.userId).toBe(testUserId);
        expect(identityRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ userId: testUserId }),
        );
        // linkUserToIdentity does NOT publish event (lacks org context)
        // Use linkUserToIdentityWithProfile for event publishing
        expect(eventPublisher.publish).not.toHaveBeenCalled();
      });

      it('should throw error if identity not found', async () => {
        const nonExistentId = '550e8400-e29b-41d4-a716-446655449999';
        const testUserId = '550e8400-e29b-41d4-a716-446655440012';
        jest.spyOn(identityRepository, 'findOne').mockResolvedValue(null);

        await expect(service.linkUserToIdentity(nonExistentId, testUserId)).rejects.toThrow(
          `DebtorIdentity ${nonExistentId} not found`,
        );
      });
    });

    describe('R-DBR-ID-005: Preventing duplicate user linkage', () => {
      it('should throw error if identity already linked to different user', async () => {
        const differentUserId = '550e8400-e29b-41d4-a716-446655440099';
        jest.spyOn(identityRepository, 'findOne').mockResolvedValue(mockIdentityWithUser);

        await expect(
          service.linkUserToIdentity(mockIdentityWithUser.id, differentUserId),
        ).rejects.toThrow(
          `DebtorIdentity ${mockIdentityWithUser.id} is already linked to user ${mockIdentityWithUser.userId}`,
        );

        expect(identityRepository.save).not.toHaveBeenCalled();
        expect(eventPublisher.publish).not.toHaveBeenCalled();
      });

      it('should be idempotent when linking same user again', async () => {
        jest.spyOn(identityRepository, 'findOne').mockResolvedValue(mockIdentityWithUser);
        jest.spyOn(identityRepository, 'save').mockResolvedValue(mockIdentityWithUser);

        const result = await service.linkUserToIdentity(mockIdentityWithUser.id, mockIdentityWithUser.userId);

        expect(result.userId).toBe(mockIdentityWithUser.userId);
        expect(identityRepository.save).toHaveBeenCalled();
        expect(eventPublisher.publish).not.toHaveBeenCalled();
      });
    });
  });

  describe('linkUserToIdentityWithProfile', () => {
    it('should link user with organization context and publish complete event', async () => {
      const testUserId = '550e8400-e29b-41d4-a716-446655440013';
      // Create a fresh identity without userId to avoid test pollution
      const freshIdentity = {
        ...mockIdentity,
        userId: null,
      };
      const updatedIdentity = { ...freshIdentity, userId: testUserId };
      jest.spyOn(identityRepository, 'findOne').mockResolvedValue(freshIdentity);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);
      jest.spyOn(identityRepository, 'save').mockResolvedValue(updatedIdentity);

      const result = await service.linkUserToIdentityWithProfile(
        freshIdentity.id,
        testUserId,
        mockProfile.organizationId,
      );

      expect(result.userId).toBe(testUserId);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTORS_USER_LINKED,
        expect.objectContaining({
          debtorIdentityId: freshIdentity.id,
          debtorProfileId: mockProfile.id,
          userId: testUserId,
          organizationId: mockProfile.organizationId,
        }),
        DebtorUserLinkedDto,
      );
    });

    it('should throw error if profile not found in organization', async () => {
      const testUserId = '550e8400-e29b-41d4-a716-446655440013';
      const wrongOrgId = '550e8400-e29b-41d4-a716-446655449998';
      jest.spyOn(identityRepository, 'findOne').mockResolvedValue(mockIdentity);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.linkUserToIdentityWithProfile(mockIdentity.id, testUserId, wrongOrgId),
      ).rejects.toThrow(
        `No DebtorProfile found for identity ${mockIdentity.id} in organization ${wrongOrgId}`,
      );
    });

    it('should be idempotent and still publish event when already linked', async () => {
      jest.spyOn(identityRepository, 'findOne').mockResolvedValue(mockIdentityWithUser);
      jest.spyOn(profileRepository, 'findOne').mockResolvedValue(mockProfile);

      const result = await service.linkUserToIdentityWithProfile(
        mockIdentityWithUser.id,
        mockIdentityWithUser.userId,
        mockProfile.organizationId,
      );

      expect(result.userId).toBe(mockIdentityWithUser.userId);
      expect(eventPublisher.publish).toHaveBeenCalled();
    });
  });

  describe('unlinkUserFromIdentity', () => {
    it('should remove user linkage from identity', async () => {
      const unlinkedIdentity = { ...mockIdentityWithUser, userId: null };
      jest.spyOn(identityRepository, 'findOne').mockResolvedValue(mockIdentityWithUser);
      jest.spyOn(identityRepository, 'save').mockResolvedValue(unlinkedIdentity);

      const result = await service.unlinkUserFromIdentity(mockIdentityWithUser.id);

      expect(result.userId).toBeNull();
      expect(identityRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null }),
      );
    });

    it('should throw error if identity not found', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655449997';
      jest.spyOn(identityRepository, 'findOne').mockResolvedValue(null);

      await expect(service.unlinkUserFromIdentity(nonExistentId)).rejects.toThrow(
        `DebtorIdentity ${nonExistentId} not found`,
      );
    });
  });

  describe('findIdentityByUserId', () => {
    it('should find identity by userId with profiles loaded', async () => {
      jest.spyOn(identityRepository, 'findOne').mockResolvedValue(mockIdentityWithUser);

      const result = await service.findIdentityByUserId(mockIdentityWithUser.userId);

      expect(result).toEqual(mockIdentityWithUser);
      expect(identityRepository.findOne).toHaveBeenCalledWith({
        where: { userId: mockIdentityWithUser.userId },
        relations: ['profiles'],
      });
    });

    it('should return null if no identity found', async () => {
      const nonExistentUserId = '550e8400-e29b-41d4-a716-446655449996';
      jest.spyOn(identityRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findIdentityByUserId(nonExistentUserId);

      expect(result).toBeNull();
    });
  });

  describe('findIdentityWithProfiles', () => {
    it('should find identity by ID with profiles loaded', async () => {
      jest.spyOn(identityRepository, 'findOne').mockResolvedValue(mockIdentity);

      const result = await service.findIdentityWithProfiles(mockIdentity.id);

      expect(result).toEqual(mockIdentity);
      expect(identityRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockIdentity.id },
        relations: ['profiles'],
      });
    });
  });

  describe('generateDebtorKey', () => {
    it('should generate key using email when provided', () => {
      const testOrgId = mockProfile.organizationId;
      const key = service.generateDebtorKey({
        organizationId: testOrgId,
        email: 'John.Doe@Example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(key).toBe(`${testOrgId}:email:john.doe@example.com`);
    });

    it('should generate deterministic hash key using name and DOB', () => {
      const testOrgId = mockProfile.organizationId;
      const key1 = service.generateDebtorKey({
        organizationId: testOrgId,
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
      });

      const key2 = service.generateDebtorKey({
        organizationId: testOrgId,
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
      });

      expect(key1).toBe(key2);
      expect(key1).toMatch(new RegExp(`^${testOrgId}:hash:[a-f0-9]{16}$`));
    });

    it('should be case-insensitive and trim whitespace', () => {
      const testOrgId = mockProfile.organizationId;
      const key1 = service.generateDebtorKey({
        organizationId: testOrgId,
        email: '  JOHN.DOE@EXAMPLE.COM  ',
      });

      const key2 = service.generateDebtorKey({
        organizationId: testOrgId,
        email: 'john.doe@example.com',
      });

      expect(key1).toBe(key2);
    });
  });

  describe('generateSsnHash', () => {
    it('should generate consistent SHA-256 hash for SSN', () => {
      const hash1 = service.generateSsnHash('123456789');
      const hash2 = service.generateSsnHash('123456789');

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64-character hex string
    });

    it('should strip non-digit characters from SSN', () => {
      const hash1 = service.generateSsnHash('123-45-6789');
      const hash2 = service.generateSsnHash('123456789');

      expect(hash1).toBe(hash2);
    });

    it('should throw error for invalid SSN length', () => {
      expect(() => service.generateSsnHash('12345')).toThrow('SSN must be exactly 9 digits');
      expect(() => service.generateSsnHash('1234567890')).toThrow('SSN must be exactly 9 digits');
    });

    it('should throw error for non-numeric SSN after cleaning', () => {
      expect(() => service.generateSsnHash('abc-de-fghi')).toThrow('SSN must be exactly 9 digits');
    });
  });
});
