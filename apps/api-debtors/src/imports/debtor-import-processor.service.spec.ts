/**
 * DebtorImportProcessor Unit Tests
 *
 * SYSTEM RULES VALIDATED:
 * - R-DBR-IMP-002: DebtorImportProcessor must successfully orchestrate identity, profile, and contact creation
 * - R-DBR-IMP-003: DebtorImportProcessor must handle errors gracefully without halting batch
 *
 * TESTING APPROACH:
 * - Unit tests in complete isolation
 * - All external dependencies (Services, EventPublisher) are mocked
 * - Tests focus on orchestration logic and error handling
 * - Validates batch processing, retry logic, and event publishing
 */

import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { DebtorImportProcessor } from './debtor-import-processor.service';
import { DebtorIdentityService } from '../identity/identity.service';
import { ProfilesService } from '../profiles/profiles.service';
import { DebtorAddressService } from '../contact/services/address.service';
import { DebtorEmailService } from '../contact/services/email.service';
import { DebtorPhoneService } from '../contact/services/phone.service';
import { ImportBatchCompletedDto } from '../events/event-dto/debtors/import-batch-completed.dto';

describe('DebtorImportProcessor', () => {
  let processor: DebtorImportProcessor;
  let identityService: jest.Mocked<DebtorIdentityService>;
  let profilesService: jest.Mocked<ProfilesService>;
  let addressService: jest.Mocked<DebtorAddressService>;
  let emailService: jest.Mocked<DebtorEmailService>;
  let phoneService: jest.Mocked<DebtorPhoneService>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const mockOrgId = '550e8400-e29b-41d4-a716-446655440001';
  const mockPortfolioId = '550e8400-e29b-41d4-a716-446655440002';
  const mockImportJobId = '550e8400-e29b-41d4-a716-446655440003';
  const mockIdentityId = '550e8400-e29b-41d4-a716-446655440004';
  const mockProfileId = '550e8400-e29b-41d4-a716-446655440005';

  beforeEach(async () => {
    const mockIdentityService = {
      generateSsnHash: jest.fn(),
      findOrCreateIdentity: jest.fn(),
    };

    const mockProfilesService = {
      findOrCreateProfile: jest.fn(),
    };

    const mockAddressService = {
      create: jest.fn(),
    };

    const mockEmailService = {
      create: jest.fn(),
    };

    const mockPhoneService = {
      create: jest.fn(),
    };

    const mockEventPublisher = {
      publish: jest.fn(),
    };

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        DebtorImportProcessor,
        {
          provide: DebtorIdentityService,
          useValue: mockIdentityService,
        },
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
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
      ],
    }).compile();

    processor = module.get<DebtorImportProcessor>(DebtorImportProcessor);
    identityService = module.get(DebtorIdentityService);
    profilesService = module.get(ProfilesService);
    addressService = module.get(DebtorAddressService);
    emailService = module.get(DebtorEmailService);
    phoneService = module.get(DebtorPhoneService);
    eventPublisher = module.get(EventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('R-DBR-IMP-002: Successful batch orchestration', () => {
    it('should successfully process batch with new identity and profile', async () => {
      const batchData = {
        importJobId: mockImportJobId,
        portfolioId: mockPortfolioId,
        organizationId: mockOrgId,
        batchNumber: 1,
        totalBatches: 1,
        debtors: [
          {
            debtorKey: 'debtor-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+15551234567',
            address: {
              streetLine1: '123 Main St',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
            },
            dateOfBirth: '1990-01-01',
            ssn: '123-45-6789',
            debtIds: ['debt-1', 'debt-2'],
          },
        ],
      };

      // Mock identity service
      identityService.generateSsnHash.mockReturnValue('hashed-ssn');
      identityService.findOrCreateIdentity.mockResolvedValue({
        identity: { id: mockIdentityId } as any,
        isNew: true,
      });

      // Mock profile service
      profilesService.findOrCreateProfile.mockResolvedValue({
        profile: { id: mockProfileId } as any,
        isNew: true,
      });

      // Mock contact services
      addressService.create.mockResolvedValue({} as any);
      emailService.create.mockResolvedValue({} as any);
      phoneService.create.mockResolvedValue({} as any);

      // Mock event publisher
      eventPublisher.publish.mockResolvedValue('');

      const result = await processor.processBatch(batchData);

      // Verify orchestration
      expect(identityService.generateSsnHash).toHaveBeenCalledWith('123-45-6789');
      expect(identityService.findOrCreateIdentity).toHaveBeenCalledWith({
        email: 'john.doe@example.com',
        ssnHash: 'hashed-ssn',
      });

      expect(profilesService.findOrCreateProfile).toHaveBeenCalledWith(
        mockIdentityId,
        mockOrgId,
        {
          firstName: 'John',
          lastName: 'Doe',
          middleName: undefined,
          dateOfBirth: '1990-01-01',
        },
      );

      // Verify contact info created for new profile
      expect(emailService.create).toHaveBeenCalledWith(mockProfileId, {
        email: 'john.doe@example.com',
        isPrimary: true,
      });

      expect(phoneService.create).toHaveBeenCalledWith(mockProfileId, {
        phoneNumber: '+15551234567',
        isPrimary: true,
      });

      expect(addressService.create).toHaveBeenCalledWith(mockProfileId, {
        street1: '123 Main St',
        street2: undefined,
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        isPrimary: true,
      });

      // Verify result
      expect(result.debtorMappings).toHaveLength(1);
      expect(result.debtorMappings[0]).toEqual({
        debtorKey: 'debtor-1',
        debtorIdentityId: mockIdentityId,
        debtorProfileId: mockProfileId,
        debtIds: ['debt-1', 'debt-2'],
        isNewIdentity: true,
        isNewProfile: true,
      });

      expect(result.errors).toHaveLength(0);

      // Verify event published
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTORS_IMPORT_BATCH_COMPLETED,
        expect.objectContaining({
          importJobId: mockImportJobId,
          organizationId: mockOrgId,
          portfolioId: mockPortfolioId,
          batchNumber: 1,
          totalProcessed: 1,
          successCount: 1,
          failureCount: 0,
        }),
        ImportBatchCompletedDto,
      );
    });

    it('should process batch with existing identity and new profile', async () => {
      const batchData = {
        importJobId: mockImportJobId,
        portfolioId: mockPortfolioId,
        organizationId: mockOrgId,
        batchNumber: 1,
        totalBatches: 1,
        debtors: [
          {
            debtorKey: 'debtor-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            debtIds: ['debt-1'],
          },
        ],
      };

      // Mock existing identity
      identityService.findOrCreateIdentity.mockResolvedValue({
        identity: { id: mockIdentityId } as any,
        isNew: false, // Existing identity
      });

      // Mock new profile
      profilesService.findOrCreateProfile.mockResolvedValue({
        profile: { id: mockProfileId } as any,
        isNew: true, // New profile
      });

      eventPublisher.publish.mockResolvedValue('');

      const result = await processor.processBatch(batchData);

      expect(result.debtorMappings[0].isNewIdentity).toBe(false);
      expect(result.debtorMappings[0].isNewProfile).toBe(true);

      // Verify email created for new profile
      expect(emailService.create).toHaveBeenCalled();
    });

    it('should not create contact info for existing profile', async () => {
      const batchData = {
        importJobId: mockImportJobId,
        portfolioId: mockPortfolioId,
        organizationId: mockOrgId,
        batchNumber: 1,
        totalBatches: 1,
        debtors: [
          {
            debtorKey: 'debtor-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+15551234567',
            address: {
              streetLine1: '123 Main St',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
            },
            debtIds: ['debt-1'],
          },
        ],
      };

      // Mock existing identity and existing profile
      identityService.findOrCreateIdentity.mockResolvedValue({
        identity: { id: mockIdentityId } as any,
        isNew: false,
      });

      profilesService.findOrCreateProfile.mockResolvedValue({
        profile: { id: mockProfileId } as any,
        isNew: false, // Existing profile
      });

      eventPublisher.publish.mockResolvedValue('');

      await processor.processBatch(batchData);

      // Verify contact info NOT created for existing profile
      expect(emailService.create).not.toHaveBeenCalled();
      expect(phoneService.create).not.toHaveBeenCalled();
      expect(addressService.create).not.toHaveBeenCalled();
    });

    it('should process multiple debtors in batch', async () => {
      const batchData = {
        importJobId: mockImportJobId,
        portfolioId: mockPortfolioId,
        organizationId: mockOrgId,
        batchNumber: 1,
        totalBatches: 1,
        debtors: [
          {
            debtorKey: 'debtor-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            debtIds: ['debt-1'],
          },
          {
            debtorKey: 'debtor-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            debtIds: ['debt-2'],
          },
          {
            debtorKey: 'debtor-3',
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob@example.com',
            debtIds: ['debt-3'],
          },
        ],
      };

      identityService.findOrCreateIdentity.mockResolvedValue({
        identity: { id: mockIdentityId } as any,
        isNew: true,
      });

      profilesService.findOrCreateProfile.mockResolvedValue({
        profile: { id: mockProfileId } as any,
        isNew: true,
      });

      emailService.create.mockResolvedValue({} as any);
      eventPublisher.publish.mockResolvedValue('');

      const result = await processor.processBatch(batchData);

      expect(result.debtorMappings).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.debtorMappings.map(m => m.debtorKey)).toEqual(['debtor-1', 'debtor-2', 'debtor-3']);

      expect(identityService.findOrCreateIdentity).toHaveBeenCalledTimes(3);
      expect(profilesService.findOrCreateProfile).toHaveBeenCalledTimes(3);
    });
  });

  describe('R-DBR-IMP-003: Error handling without halting batch', () => {
    it('should continue processing batch when one debtor fails', async () => {
      const batchData = {
        importJobId: mockImportJobId,
        portfolioId: mockPortfolioId,
        organizationId: mockOrgId,
        batchNumber: 1,
        totalBatches: 1,
        debtors: [
          {
            debtorKey: 'debtor-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            debtIds: ['debt-1'],
          },
          {
            debtorKey: 'debtor-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            debtIds: ['debt-2'],
          },
          {
            debtorKey: 'debtor-3',
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob@example.com',
            debtIds: ['debt-3'],
          },
        ],
      };

      identityService.findOrCreateIdentity
        .mockResolvedValueOnce({
          identity: { id: mockIdentityId } as any,
          isNew: true,
        })
        .mockRejectedValueOnce(new Error('Database connection failed')) // Debtor 2 fails
        .mockResolvedValueOnce({
          identity: { id: mockIdentityId } as any,
          isNew: true,
        });

      profilesService.findOrCreateProfile.mockResolvedValue({
        profile: { id: mockProfileId } as any,
        isNew: true,
      });

      emailService.create.mockResolvedValue({} as any);
      eventPublisher.publish.mockResolvedValue('');

      const result = await processor.processBatch(batchData);

      // Verify batch continued despite error
      expect(result.debtorMappings).toHaveLength(2);
      expect(result.errors).toHaveLength(1);

      expect(result.debtorMappings.map(m => m.debtorKey)).toEqual(['debtor-1', 'debtor-3']);
      expect(result.errors[0]).toEqual({
        debtorKey: 'debtor-2',
        error: 'Database connection failed',
        debtIds: ['debt-2'],
        willRetry: true, // "connection" keyword makes it retryable
      });

      // Verify event published with error info
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTORS_IMPORT_BATCH_COMPLETED,
        expect.objectContaining({
          totalProcessed: 3,
          successCount: 2,
          failureCount: 1,
          errors: expect.arrayContaining([
            expect.objectContaining({
              debtorKey: 'debtor-2',
              error: 'Database connection failed',
            }),
          ]),
        }),
        ImportBatchCompletedDto,
      );
    });

    it('should mark retryable errors for retry', async () => {
      const batchData = {
        importJobId: mockImportJobId,
        portfolioId: mockPortfolioId,
        organizationId: mockOrgId,
        batchNumber: 1,
        totalBatches: 1,
        debtors: [
          {
            debtorKey: 'debtor-1',
            firstName: 'John',
            lastName: 'Doe',
            debtIds: ['debt-1'],
          },
        ],
      };

      const retryableError = new Error('connection timeout');
      (retryableError as any).code = 'ETIMEDOUT';

      identityService.findOrCreateIdentity.mockRejectedValue(retryableError);
      eventPublisher.publish.mockResolvedValue('');

      const result = await processor.processBatch(batchData);

      expect(result.errors[0].willRetry).toBe(true);
    });

    it('should not mark validation errors for retry', async () => {
      const batchData = {
        importJobId: mockImportJobId,
        portfolioId: mockPortfolioId,
        organizationId: mockOrgId,
        batchNumber: 1,
        totalBatches: 1,
        debtors: [
          {
            debtorKey: 'debtor-1',
            firstName: 'John',
            lastName: 'Doe',
            debtIds: ['debt-1'],
          },
        ],
      };

      const validationError = new Error('validation failed: required field missing');

      identityService.findOrCreateIdentity.mockRejectedValue(validationError);
      eventPublisher.publish.mockResolvedValue('');

      const result = await processor.processBatch(batchData);

      expect(result.errors[0].willRetry).toBe(false);
    });
  });

  describe('Helper methods', () => {
    describe('calculateBatchSize', () => {
      it('should return 100 for less than 1000 debtors', () => {
        expect(processor.calculateBatchSize(500)).toBe(100);
        expect(processor.calculateBatchSize(999)).toBe(100);
      });

      it('should return 500 for 1000-9999 debtors', () => {
        expect(processor.calculateBatchSize(1000)).toBe(500);
        expect(processor.calculateBatchSize(5000)).toBe(500);
        expect(processor.calculateBatchSize(9999)).toBe(500);
      });

      it('should return 1000 for 10000-49999 debtors', () => {
        expect(processor.calculateBatchSize(10000)).toBe(1000);
        expect(processor.calculateBatchSize(25000)).toBe(1000);
        expect(processor.calculateBatchSize(49999)).toBe(1000);
      });

      it('should return 2000 for 50000+ debtors', () => {
        expect(processor.calculateBatchSize(50000)).toBe(2000);
        expect(processor.calculateBatchSize(100000)).toBe(2000);
      });
    });

    describe('splitIntoBatches', () => {
      it('should split items into batches of specified size', () => {
        const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const batches = processor.splitIntoBatches(items, 3);

        expect(batches).toEqual([
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
          [10],
        ]);
      });

      it('should handle empty array', () => {
        const batches = processor.splitIntoBatches([], 100);
        expect(batches).toEqual([]);
      });

      it('should handle single batch', () => {
        const items = [1, 2, 3];
        const batches = processor.splitIntoBatches(items, 10);
        expect(batches).toEqual([[1, 2, 3]]);
      });
    });
  });
});
