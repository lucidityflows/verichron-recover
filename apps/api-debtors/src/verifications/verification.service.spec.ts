/**
 * VerificationService Unit Tests
 *
 * SYSTEM RULES VALIDATED:
 * - R-DBR-VER-001: VerificationService must orchestrate verification requests with third-party providers
 *
 * This includes:
 * - Organization-scoped access verification
 * - Multiple verification types (address, phone, email, skip trace)
 * - Provider orchestration and abstraction
 * - Status tracking and lifecycle management
 * - Event publishing for verification lifecycle
 * - Retry mechanism for failed verifications
 *
 * TESTING APPROACH:
 * - Unit tests in complete isolation
 * - All external dependencies (Repository, Services, Providers, EventPublisher, RequestContext) are mocked
 * - Tests focus on orchestration logic, not provider implementation
 */

import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { VerificationRequestStatus, VerificationType } from '@verichron/enums/dist';
import { VerificationService } from './verification.service';
import { VerificationRequest } from './entities/verification.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { RequestContext } from '../core/services/request-context.service';
import { AddressVerificationProvider } from './providers/address-verification.provider';
import { PhoneVerificationProvider } from './providers/phone-verification.provider';
import { EmailVerificationProvider } from './providers/email-verification.provider';
import { SkipTraceProvider } from './providers/skip-trace.provider';
import {
  VerificationCompletedDto,
  VerificationFailedDto,
} from '../events/event-dto';
import {
  VerificationNotFoundException,
  VerificationAlreadyInProgressException,
} from './errors';

describe('VerificationService', () => {
  let service: VerificationService;
  let verificationRepository: jest.Mocked<Repository<VerificationRequest>>;
  let profilesService: jest.Mocked<ProfilesService>;
  let requestContext: jest.Mocked<RequestContext>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let addressProvider: jest.Mocked<AddressVerificationProvider>;
  let phoneProvider: jest.Mocked<PhoneVerificationProvider>;
  let emailProvider: jest.Mocked<EmailVerificationProvider>;
  let skipTraceProvider: jest.Mocked<SkipTraceProvider>;

  const mockOrgId = '550e8400-e29b-41d4-a716-446655440001';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440002';
  const mockDebtorProfileId = '550e8400-e29b-41d4-a716-446655440003';
  const mockDebtorIdentityId = '550e8400-e29b-41d4-a716-446655440005';
  const mockVerificationId = '550e8400-e29b-41d4-a716-446655440006';

  const mockVerification: any = {
    id: mockVerificationId,
    debtorProfileId: mockDebtorProfileId,
    organizationId: mockOrgId,
    verificationType: 'ADDRESS_VERIFICATION',
    inputData: { address: '123 Main St' },
    metadata: {},
    status: VerificationRequestStatus.PENDING,
    requestedBy: mockUserId,
    requestedAt: new Date('2024-01-01'),
    startedAt: null,
    completedAt: null,
    retryCount: 0,
    verified: false,
    result: null,
    confidenceScore: null,
    provider: null,
    costCents: null,
    errorMessage: null,
    errorCode: null,
  };

  beforeEach(async () => {
    const mockVerificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
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

    const mockAddressProvider = {
      verify: jest.fn(),
      getProviderName: jest.fn().mockReturnValue('MockAddressProvider'),
    };

    const mockPhoneProvider = {
      verify: jest.fn(),
      getProviderName: jest.fn().mockReturnValue('MockPhoneProvider'),
    };

    const mockEmailProvider = {
      verify: jest.fn(),
      getProviderName: jest.fn().mockReturnValue('MockEmailProvider'),
    };

    const mockSkipTraceProvider = {
      verify: jest.fn(),
      getProviderName: jest.fn().mockReturnValue('MockSkipTraceProvider'),
    };

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        VerificationService,
        {
          provide: getRepositoryToken(VerificationRequest),
          useValue: mockVerificationRepository,
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
          provide: AddressVerificationProvider,
          useValue: mockAddressProvider,
        },
        {
          provide: PhoneVerificationProvider,
          useValue: mockPhoneProvider,
        },
        {
          provide: EmailVerificationProvider,
          useValue: mockEmailProvider,
        },
        {
          provide: SkipTraceProvider,
          useValue: mockSkipTraceProvider,
        },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    verificationRepository = module.get(getRepositoryToken(VerificationRequest));
    profilesService = module.get(ProfilesService);
    requestContext = module.get(RequestContext);
    eventPublisher = module.get(EventPublisher);
    addressProvider = module.get(AddressVerificationProvider);
    phoneProvider = module.get(PhoneVerificationProvider);
    emailProvider = module.get(EmailVerificationProvider);
    skipTraceProvider = module.get(SkipTraceProvider);

    // Set up default mocks
    requestContext.getOrgId.mockReturnValue(mockOrgId);
    requestContext.getUserId.mockReturnValue(mockUserId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('R-DBR-VER-001: Orchestrating verification requests with providers', () => {
    describe('findAll with filtering and pagination', () => {
      it('should find all verifications for a debtor profile with organization scoping', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[mockVerification], 1]),
        };

        verificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = await service.findAll(mockDebtorProfileId, {});

        expect(result).toEqual({
          data: [mockVerification],
          total: 1,
          page: 1,
          pageSize: 20,
        });
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'verification.debtorProfileId = :debtorProfileId',
          { debtorProfileId: mockDebtorProfileId },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'verification.organizationId = :organizationId',
          { organizationId: mockOrgId },
        );
      });

      it('should apply verification type filter', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        verificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await service.findAll(mockDebtorProfileId, { verificationType: VerificationType.ADDRESS_VERIFICATION });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'verification.verificationType = :verificationType',
          { verificationType: 'ADDRESS_VERIFICATION' },
        );
      });
    });

    describe('findOne with access controls', () => {
      it('should find verification by ID within organization', async () => {
        verificationRepository.findOne.mockResolvedValue(mockVerification);

        const result = await service.findOne(mockVerificationId, mockDebtorProfileId);

        expect(result).toEqual(mockVerification);
        expect(verificationRepository.findOne).toHaveBeenCalledWith({
          where: {
            id: mockVerificationId,
            debtorProfileId: mockDebtorProfileId,
            organizationId: mockOrgId,
          },
        });
      });

      it('should throw VerificationNotFoundException if not found', async () => {
        verificationRepository.findOne.mockResolvedValue(null);

        await expect(
          service.findOne(mockVerificationId, mockDebtorProfileId),
        ).rejects.toThrow(VerificationNotFoundException);
      });
    });

    describe('requestVerification with event publishing', () => {
      it('should create verification request and publish event', async () => {
        verificationRepository.findOne.mockResolvedValue(null); // No existing in-progress
        verificationRepository.create.mockReturnValue(mockVerification);
        verificationRepository.save.mockResolvedValue(mockVerification);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        const createDto = {
          verificationType: 'ADDRESS_VERIFICATION',
          inputData: { address: '123 Main St' },
        };

        const result = await service.requestVerification(mockDebtorProfileId, createDto as any);

        expect(result).toEqual(mockVerification);
        expect(verificationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            debtorProfileId: mockDebtorProfileId,
            organizationId: mockOrgId,
            verificationType: 'ADDRESS_VERIFICATION',
            status: VerificationRequestStatus.PENDING,
            requestedBy: mockUserId,
          }),
        );
      });

      it('should throw VerificationAlreadyInProgressException if duplicate', async () => {
        const inProgressVerification = { ...mockVerification, status: VerificationRequestStatus.IN_PROGRESS };
        verificationRepository.findOne.mockResolvedValue(inProgressVerification);

        const createDto = {
          verificationType: 'ADDRESS_VERIFICATION',
          inputData: { address: '123 Main St' },
        };

        await expect(
          service.requestVerification(mockDebtorProfileId, createDto as any),
        ).rejects.toThrow(VerificationAlreadyInProgressException);
      });
    });

    describe('processVerification with provider orchestration', () => {
      it('should process verification successfully with provider', async () => {
        const pendingVerification = { ...mockVerification, status: VerificationRequestStatus.PENDING };
        const inProgressVerification = { ...mockVerification, status: VerificationRequestStatus.IN_PROGRESS, startedAt: new Date() };
        const completedVerification = {
          ...mockVerification,
          status: VerificationRequestStatus.VERIFIED,
          verified: true,
          provider: 'MockAddressProvider',
          confidenceScore: 95,
          result: { verified: true },
          completedAt: new Date(),
        };

        verificationRepository.findOne
          .mockResolvedValueOnce(pendingVerification) // Initial find
          .mockResolvedValueOnce(inProgressVerification); // For completeVerification

        verificationRepository.save
          .mockResolvedValueOnce(inProgressVerification) // Status update to IN_PROGRESS
          .mockResolvedValueOnce(completedVerification); // Final completion

        addressProvider.verify.mockResolvedValue({
          success: true,
          verified: true,
          confidence: 95,
          details: { verified: true },
          provider: 'MockAddressProvider',
          costCents: 50,
        });

        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.processVerification(mockVerificationId);

        expect(addressProvider.verify).toHaveBeenCalledWith(mockVerification.inputData);
        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_VERIFICATIONS_VERIFICATION_COMPLETED,
          expect.objectContaining({
            verificationId: mockVerificationId,
            debtorId: mockDebtorIdentityId,
            verified: true,
          }),
          VerificationCompletedDto,
        );
      });

      it('should handle provider error and publish failure event', async () => {
        const pendingVerification = { ...mockVerification };
        const errorVerification = {
          ...pendingVerification,
          status: VerificationRequestStatus.ERROR,
          errorMessage: 'Provider error',
          errorCode: 'UNKNOWN_ERROR',
          retryCount: 0,
          completedAt: new Date(),
        };

        verificationRepository.findOne.mockResolvedValue(pendingVerification);
        verificationRepository.save
          .mockResolvedValueOnce({ ...pendingVerification, status: VerificationRequestStatus.IN_PROGRESS, startedAt: new Date() }) // Status update to IN_PROGRESS
          .mockResolvedValueOnce(errorVerification); // Error state

        addressProvider.verify.mockRejectedValue(new Error('Provider error'));
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.processVerification(mockVerificationId);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_VERIFICATIONS_VERIFICATION_FAILED,
          expect.objectContaining({
            verificationId: mockVerificationId,
            debtorId: mockDebtorIdentityId,
            errorMessage: 'Provider error',
            retryCount: 0,
          }),
          VerificationFailedDto,
        );
      });
    });

    describe('retryVerification', () => {
      it('should retry failed verification', async () => {
        const failedVerification = {
          ...mockVerification,
          status: VerificationRequestStatus.FAILED,
          errorMessage: 'Previous error',
          retryCount: 1,
        };

        const retriedVerification = {
          ...mockVerification,
          status: VerificationRequestStatus.PENDING,
          errorMessage: undefined,
          errorCode: undefined,
          retryCount: 2,
        };

        verificationRepository.findOne
          .mockResolvedValueOnce(failedVerification) // Initial findOne for retryVerification
          .mockResolvedValueOnce({ ...retriedVerification, status: VerificationRequestStatus.PENDING }); // Background processVerification findOne

        verificationRepository.save
          .mockResolvedValueOnce(retriedVerification); // Save in retryVerification

        // Spy on processVerification to prevent it from actually running in background
        const processVerificationSpy = jest.spyOn(service, 'processVerification').mockResolvedValue(undefined);

        const result = await service.retryVerification(mockVerificationId, mockDebtorProfileId);

        expect(result.retryCount).toBe(2);
        expect(result.status).toBe(VerificationRequestStatus.PENDING);
        expect(result.errorMessage).toBeUndefined();
        expect(processVerificationSpy).toHaveBeenCalledWith(mockVerificationId);

        processVerificationSpy.mockRestore();
      });

      it('should throw error for non-retryable status', async () => {
        const verifiedVerification = {
          ...mockVerification,
          status: VerificationRequestStatus.VERIFIED,
        };

        verificationRepository.findOne.mockResolvedValue(verifiedVerification);

        await expect(
          service.retryVerification(mockVerificationId, mockDebtorProfileId),
        ).rejects.toThrow(`Cannot retry verification with status ${VerificationRequestStatus.VERIFIED}`);
      });
    });

    describe('getStatistics', () => {
      it('should calculate verification statistics', async () => {
        const verifications = [
          { ...mockVerification, status: VerificationRequestStatus.VERIFIED, verificationType: 'ADDRESS_VERIFICATION' },
          { ...mockVerification, status: VerificationRequestStatus.FAILED, verificationType: 'PHONE_VERIFICATION' },
          { ...mockVerification, status: VerificationRequestStatus.VERIFIED, verificationType: 'ADDRESS_VERIFICATION' },
        ];

        verificationRepository.find.mockResolvedValue(verifications);

        const result = await service.getStatistics(mockDebtorProfileId);

        expect(result).toEqual({
          total: 3,
          byStatus: {
            [VerificationRequestStatus.VERIFIED]: 2,
            [VerificationRequestStatus.FAILED]: 1,
          },
          byType: {
            ADDRESS_VERIFICATION: 2,
            PHONE_VERIFICATION: 1,
          },
        });
      });
    });

    describe('completeVerification', () => {
      it('should update verification with successful result', async () => {
        const resultDto = {
          verified: true,
          confidence: 95,
          details: { match: true },
          provider: 'MockProvider',
          costCents: 50,
        };

        const completedVerification = {
          ...mockVerification,
          status: VerificationRequestStatus.VERIFIED,
          verified: true,
          result: resultDto.details,
          confidenceScore: 95,
          provider: 'MockProvider',
          costCents: 50,
          completedAt: new Date(),
        };

        verificationRepository.findOne.mockResolvedValue(mockVerification);
        verificationRepository.save.mockResolvedValue(completedVerification);

        const result = await service.completeVerification(mockVerificationId, resultDto as any);

        expect(result.verified).toBe(true);
        expect(result.status).toBe(VerificationRequestStatus.VERIFIED);
        expect(result.confidenceScore).toBe(95);
      });

      it('should update verification with failed result', async () => {
        const resultDto = {
          verified: false,
          confidence: 20,
          details: { match: false },
          provider: 'MockProvider',
          errorMessage: 'No match found',
        };

        const failedVerification = {
          ...mockVerification,
          status: VerificationRequestStatus.FAILED,
          verified: false,
          result: resultDto.details,
          confidenceScore: 20,
          provider: 'MockProvider',
          errorMessage: 'No match found',
          completedAt: new Date(),
        };

        verificationRepository.findOne.mockResolvedValue(mockVerification);
        verificationRepository.save.mockResolvedValue(failedVerification);

        const result = await service.completeVerification(mockVerificationId, resultDto as any);

        expect(result.verified).toBe(false);
        expect(result.status).toBe(VerificationRequestStatus.FAILED);
      });
    });
  });
});
