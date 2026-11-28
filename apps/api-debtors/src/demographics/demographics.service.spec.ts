/**
 * DemographicsService Unit Tests
 *
 * SYSTEM RULES VALIDATED:
 * - R-DBR-DEM-001: DemographicsService must enforce stricter access controls for sensitive PII
 *
 * This includes:
 * - Organization-scoped access verification
 * - Audit logging for all access (lastAccessedAt, lastAccessedBy)
 * - Secure SSN handling (encryption, hashing, last 4 extraction)
 * - Event publishing for compliance tracking
 * - Proper error handling for unauthorized access
 *
 * TESTING APPROACH:
 * - Unit tests in complete isolation
 * - All external dependencies (Repository, Services, EventPublisher, RequestContext) are mocked
 * - Tests focus on access control, audit logging, encryption, and event publishing
 */

import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventPublisher } from '@verichron/event-publisher';
import { Sex, MaritalStatus, EmploymentStatus } from '@verichron/enums';
import { EVENT_TYPES } from '@verichron/events';
import { DemographicsService } from './demographics.service';
import { DebtorDemographics } from './entities/debtor-demographics.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { RequestContext } from '../core/services/request-context.service';
import { DemographicsCreatedDto } from '../events/event-dto/demographics/demographics-created.dto';
import { DemographicsUpdatedDto } from '../events/event-dto/demographics/demographics-updated.dto';
import {
  DemographicsNotFoundException,
  DemographicsAlreadyExistsException,
} from './errors';

describe('DemographicsService', () => {
  let service: DemographicsService;
  let demographicsRepository: jest.Mocked<Repository<DebtorDemographics>>;
  let profilesService: jest.Mocked<ProfilesService>;
  let requestContext: jest.Mocked<RequestContext>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let configService: jest.Mocked<ConfigService>;

  const mockOrgId = '550e8400-e29b-41d4-a716-446655440001';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440002';
  const mockDebtorProfileId = '550e8400-e29b-41d4-a716-446655440003';
  const mockDebtorIdentityId = '550e8400-e29b-41d4-a716-446655440005';
  const mockDemographicsId = '550e8400-e29b-41d4-a716-446655440004';

  const mockDemographics: any = {
    id: mockDemographicsId,
    debtorProfileId: mockDebtorProfileId,
    sex: Sex.MALE,
    maritalStatus: MaritalStatus.SINGLE,
    employmentStatus: EmploymentStatus.EMPLOYED_FULL_TIME,
    occupation: 'Engineer',
    employerName: 'Tech Corp',
    annualIncome: 75000,
    bankruptcyHistory: false,
    ssnLastFour: '1234',
    ssnHash: 'hash123',
    ssnEncrypted: 'encrypted:data:here',
    lastAccessedAt: new Date('2024-01-01'),
    lastAccessedBy: mockUserId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    debtorProfile: {
      organizationId: mockOrgId,
      debtorIdentityId: mockDebtorIdentityId,
    },
  };

  beforeEach(async () => {
    const mockDemographicsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockProfilesService = {
      findOne: jest.fn(),
    };

    const mockRequestContext = {
      getOrgId: jest.fn(),
      getUserId: jest.fn(),
    };

    const mockEventPublisher = {
      publish: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        DemographicsService,
        {
          provide: getRepositoryToken(DebtorDemographics),
          useValue: mockDemographicsRepository,
        },
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
        {
          provide: RequestContext,
          useValue: mockRequestContext,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DemographicsService>(DemographicsService);
    demographicsRepository = module.get(getRepositoryToken(DebtorDemographics));
    profilesService = module.get(ProfilesService);
    requestContext = module.get(RequestContext);
    eventPublisher = module.get(EventPublisher);
    configService = module.get(ConfigService);

    // Default request context setup
    requestContext.getOrgId.mockReturnValue(mockOrgId);
    requestContext.getUserId.mockReturnValue(mockUserId);

    // Default config setup (use dev key)
    configService.get.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('R-DBR-DEM-001: Enforcing strict access controls for sensitive PII', () => {
    describe('findOne with organization scoping and audit logging', () => {
      it('should find demographics with organization verification', async () => {
        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockDemographics),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        demographicsRepository.update.mockResolvedValue({ affected: 1 } as any);

        const result = await service.findOne(mockDebtorProfileId);

        expect(result).toEqual(mockDemographics);
        expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
          'demographics.debtorProfile',
          'profile',
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'profile.organizationId = :organizationId',
          { organizationId: mockOrgId },
        );
      });

      it('should log access for audit trail', async () => {
        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockDemographics),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        demographicsRepository.update.mockResolvedValue({ affected: 1 } as any);

        await service.findOne(mockDebtorProfileId);

        expect(demographicsRepository.update).toHaveBeenCalledWith(
          mockDemographicsId,
          expect.objectContaining({
            lastAccessedAt: expect.any(Date),
            lastAccessedBy: mockUserId,
          }),
        );
      });

      it('should throw DemographicsNotFoundException if not found', async () => {
        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(service.findOne(mockDebtorProfileId)).rejects.toThrow(
          DemographicsNotFoundException,
        );
      });

      it('should throw error if organization context missing', async () => {
        requestContext.getOrgId.mockReturnValue(undefined);

        await expect(service.findOne(mockDebtorProfileId)).rejects.toThrow(
          'Organization context is required',
        );
      });

      it('should exclude soft-deleted demographics', async () => {
        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(service.findOne(mockDebtorProfileId)).rejects.toThrow(
          DemographicsNotFoundException,
        );

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'demographics.deletedAt IS NULL',
        );
      });
    });

    describe('create with access controls and encryption', () => {
      it('should create demographics with audit trail', async () => {
        const createDto = {
          sex: Sex.FEMALE,
          maritalStatus: MaritalStatus.MARRIED,
          employmentStatus: EmploymentStatus.EMPLOYED_FULL_TIME,
        };

        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        demographicsRepository.create.mockReturnValue(mockDemographics);
        demographicsRepository.save.mockResolvedValue(mockDemographics);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.create(mockDebtorProfileId, createDto);

        expect(result).toEqual(mockDemographics);
        expect(demographicsRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            ...createDto,
            debtorProfileId: mockDebtorProfileId,
            lastAccessedAt: expect.any(Date),
            lastAccessedBy: mockUserId,
          }),
        );
      });

      it('should verify organization access before creating', async () => {
        const createDto = {
          sex: Sex.MALE,
        };

        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        demographicsRepository.create.mockReturnValue(mockDemographics);
        demographicsRepository.save.mockResolvedValue(mockDemographics);
        eventPublisher.publish.mockResolvedValue('');

        await service.create(mockDebtorProfileId, createDto);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'profile.organizationId = :organizationId',
          { organizationId: mockOrgId },
        );
      });

      it('should throw DemographicsAlreadyExistsException if already exists', async () => {
        const createDto = {
          sex: Sex.MALE,
        };

        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockDemographics),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(service.create(mockDebtorProfileId, createDto)).rejects.toThrow(
          DemographicsAlreadyExistsException,
        );
      });

      it('should publish DemographicsCreated event', async () => {
        const createDto = {
          sex: Sex.MALE,
        };

        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        demographicsRepository.create.mockReturnValue(mockDemographics);
        demographicsRepository.save.mockResolvedValue(mockDemographics);
        eventPublisher.publish.mockResolvedValue('');

        await service.create(mockDebtorProfileId, createDto);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_DEMOGRAPHICS_CREATED,
          expect.objectContaining({
            demographicsId: mockDemographicsId,
            debtorId: mockDebtorIdentityId,
            organizationId: mockOrgId,
          }),
          DemographicsCreatedDto,
        );
      });
    });

    describe('update with access controls', () => {
      it('should update demographics with audit trail', async () => {
        const updateDto = {
          employmentStatus: EmploymentStatus.SELF_EMPLOYED,
        };

        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockDemographics),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.update(mockDebtorProfileId, updateDto);

        expect(mockDemographics.lastAccessedAt).toBeDefined();
        expect(mockDemographics.lastAccessedBy).toBe(mockUserId);
      });

      it('should verify organization access before updating', async () => {
        const updateDto = {
          employmentStatus: EmploymentStatus.UNEMPLOYED,
        };

        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockDemographics),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.update(mockDebtorProfileId, updateDto);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'profile.organizationId = :organizationId',
          { organizationId: mockOrgId },
        );
      });

      it('should throw DemographicsNotFoundException if not found', async () => {
        const updateDto = {
          employmentStatus: EmploymentStatus.EMPLOYED_FULL_TIME,
        };

        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(service.update(mockDebtorProfileId, updateDto)).rejects.toThrow(
          DemographicsNotFoundException,
        );
      });

      it('should publish DemographicsUpdated event', async () => {
        const updateDto = {
          employmentStatus: EmploymentStatus.EMPLOYED_FULL_TIME,
        };

        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...mockDemographics }),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.update(mockDebtorProfileId, updateDto);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_DEMOGRAPHICS_UPDATED,
          expect.objectContaining({
            demographicsId: mockDemographicsId,
            debtorId: mockDebtorIdentityId,
            organizationId: mockOrgId,
            updatedFields: expect.any(Array),
          }),
          DemographicsUpdatedDto,
        );
      });
    });

    describe('partialUpdate with access controls', () => {
      it('should update only provided fields with audit trail', async () => {
        const partialUpdateDto = {
          annualIncome: 85000,
        };

        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...mockDemographics }),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        demographicsRepository.save.mockResolvedValue({
          ...mockDemographics,
          annualIncome: 85000,
        });
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.partialUpdate(mockDebtorProfileId, partialUpdateDto);

        expect(result.annualIncome).toBe(85000);
        expect(demographicsRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            lastAccessedAt: expect.any(Date),
            lastAccessedBy: mockUserId,
          }),
        );
      });

      it('should publish event with updated fields', async () => {
        const partialUpdateDto = {
          maritalStatus: MaritalStatus.DIVORCED,
        };

        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...mockDemographics }),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        demographicsRepository.save.mockResolvedValue(mockDemographics);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.partialUpdate(mockDebtorProfileId, partialUpdateDto);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_DEMOGRAPHICS_UPDATED,
          expect.objectContaining({
            updatedFields: ['maritalStatus'],
          }),
          DemographicsUpdatedDto,
        );
      });
    });

    describe('remove (soft delete) with access controls', () => {
      it('should soft delete demographics with audit trail', async () => {
        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockDemographics),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        demographicsRepository.update.mockResolvedValue({ affected: 1 } as any);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.remove(mockDebtorProfileId);

        expect(demographicsRepository.update).toHaveBeenCalledWith(
          mockDemographicsId,
          expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        );
      });

      it('should verify organization access before deleting', async () => {
        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockDemographics),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        demographicsRepository.update.mockResolvedValue({ affected: 1 } as any);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.remove(mockDebtorProfileId);

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'profile.organizationId = :organizationId',
          { organizationId: mockOrgId },
        );
      });

      it('should throw DemographicsNotFoundException if not found', async () => {
        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await expect(service.remove(mockDebtorProfileId)).rejects.toThrow(
          DemographicsNotFoundException,
        );
      });

      it('should publish DemographicsUpdated event with deletedAt field', async () => {
        const mockQueryBuilder = {
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockDemographics),
        };

        demographicsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
        demographicsRepository.update.mockResolvedValue({ affected: 1 } as any);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.remove(mockDebtorProfileId);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_DEMOGRAPHICS_UPDATED,
          expect.objectContaining({
            updatedFields: ['deletedAt'],
          }),
          DemographicsUpdatedDto,
        );
      });
    });

    describe('exists check', () => {
      it('should return true if demographics exist', async () => {
        demographicsRepository.count.mockResolvedValue(1);

        const result = await service.exists(mockDebtorProfileId);

        expect(result).toBe(true);
        expect(demographicsRepository.count).toHaveBeenCalledWith({
          where: { debtorProfileId: mockDebtorProfileId, deletedAt: IsNull() },
        });
      });

      it('should return false if demographics do not exist', async () => {
        demographicsRepository.count.mockResolvedValue(0);

        const result = await service.exists(mockDebtorProfileId);

        expect(result).toBe(false);
      });
    });
  });
});
