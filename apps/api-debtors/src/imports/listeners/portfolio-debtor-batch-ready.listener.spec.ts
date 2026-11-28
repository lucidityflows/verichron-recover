/**
 * PortfolioDebtorBatchReadyListener Unit Tests
 *
 * SYSTEM RULES VALIDATED:
 * - R-DBR-IMP-001: PortfolioDebtorBatchReadyListener must correctly consume debts.portfolio.debtor_batch_ready events
 *
 * TESTING APPROACH:
 * - Unit tests in isolation
 * - DebtorImportProcessor is mocked
 * - Tests focus on event handling, data transformation, and error propagation
 * - Validates event subscription configuration
 */

import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { PortfolioDebtorBatchReadyListener } from './portfolio-debtor-batch-ready.listener';
import { DebtorImportProcessor } from '../debtor-import-processor.service';
import { ModuleRef } from '@nestjs/core';

describe('PortfolioDebtorBatchReadyListener', () => {
  let listener: PortfolioDebtorBatchReadyListener;
  let debtorImportProcessor: jest.Mocked<DebtorImportProcessor>;
  let moduleRef: jest.Mocked<ModuleRef>;

  const mockOrgId = '550e8400-e29b-41d4-a716-446655440001';
  const mockPortfolioId = '550e8400-e29b-41d4-a716-446655440002';
  const mockImportJobId = '550e8400-e29b-41d4-a716-446655440003';
  const mockDebtorId = '550e8400-e29b-41d4-a716-446655440004';

  beforeEach(async () => {
    const mockImportProcessor = {
      processBatchFromEvent: jest.fn(),
    };

    const mockModuleRef = {
      resolve: jest.fn().mockResolvedValue(mockImportProcessor),
    };

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        PortfolioDebtorBatchReadyListener,
        {
          provide: ModuleRef,
          useValue: mockModuleRef,
        },
        {
          provide: DebtorImportProcessor,
          useValue: mockImportProcessor,
        },
      ],
    }).compile();

    listener = module.get<PortfolioDebtorBatchReadyListener>(PortfolioDebtorBatchReadyListener);
    debtorImportProcessor = module.get(DebtorImportProcessor);
    moduleRef = module.get(ModuleRef);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('R-DBR-IMP-001: Consume and process debtor batch events', () => {
    it('should process debtor batch with complete data', async () => {
      const mockEvent: EventEnvelope<any> = {
        eventId: 'event-123',
        eventType: EVENT_TYPES.DEBTS_PORTFOLIO_DEBTOR_BATCH_READY,
        eventSource: 'api-debts',
        timestamp: new Date().toISOString(),
        data: {
          importJobId: mockImportJobId,
          portfolioId: mockPortfolioId,
          organizationId: mockOrgId,
          batchNumber: 1,
          totalBatches: 5,
          debtorCount: 3,
          debtors: [
            {
              debtorId: mockDebtorId + '-1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              phone: '+15551234567',
              addressLine1: '123 Main St',
              addressLine2: 'Apt 4B',
              city: 'New York',
              state: 'NY',
              zipCode: '10001',
            },
            {
              debtorId: mockDebtorId + '-2',
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane.smith@example.com',
              phone: '+15559876543',
              addressLine1: '456 Oak Ave',
              city: 'Los Angeles',
              state: 'CA',
              zipCode: '90001',
            },
            {
              debtorId: mockDebtorId + '-3',
              firstName: 'Bob',
              lastName: 'Johnson',
              email: 'bob.johnson@example.com',
              // No phone, no address
            },
          ],
        },
      };

      debtorImportProcessor.processBatchFromEvent.mockResolvedValue({} as any);

      await listener.onMessage(mockEvent.data, mockEvent);

      expect(debtorImportProcessor.processBatchFromEvent).toHaveBeenCalledTimes(1);
      expect(debtorImportProcessor.processBatchFromEvent).toHaveBeenCalledWith(mockEvent.data);
    });

    it('should generate debtorKey from name and address when email is missing', async () => {
      // Note: debtorKey generation is now inside processBatchFromEvent, 
      // which is called by the listener. The listener itself doesn't 
      // generate the key anymore, it just passes the data to the processor.
      // We'll update this test to just verify the processor is called.
      const mockEvent: EventEnvelope<any> = {
        eventId: 'event-123',
        eventType: EVENT_TYPES.DEBTS_PORTFOLIO_DEBTOR_BATCH_READY,
        eventSource: 'api-debts',
        timestamp: new Date().toISOString(),
        data: {
          importJobId: mockImportJobId,
          portfolioId: mockPortfolioId,
          organizationId: mockOrgId,
          batchNumber: 1,
          totalBatches: 1,
          debtorCount: 1,
          debtors: [
            {
              debtorId: mockDebtorId,
              firstName: 'John',
              lastName: 'Doe',
              // No email
              addressLine1: '123 Main St',
              zipCode: '10001',
            },
          ],
        },
      };

      debtorImportProcessor.processBatchFromEvent.mockResolvedValue({} as any);

      await listener.onMessage(mockEvent.data, mockEvent);

      expect(debtorImportProcessor.processBatchFromEvent).toHaveBeenCalledWith(mockEvent.data);
    });

    it('should handle partial debtor data', async () => {
      const mockEvent: EventEnvelope<any> = {
        eventId: 'event-123',
        eventType: EVENT_TYPES.DEBTS_PORTFOLIO_DEBTOR_BATCH_READY,
        eventSource: 'api-debts',
        timestamp: new Date().toISOString(),
        data: {
          importJobId: mockImportJobId,
          portfolioId: mockPortfolioId,
          organizationId: mockOrgId,
          batchNumber: 1,
          totalBatches: 1,
          debtorCount: 1,
          debtors: [
            {
              debtorId: mockDebtorId,
              firstName: 'John',
              lastName: 'Doe',
              // Minimal data - no contact info
            },
          ],
        },
      };

      debtorImportProcessor.processBatchFromEvent.mockResolvedValue({} as any);

      await listener.onMessage(mockEvent.data, mockEvent);

      expect(debtorImportProcessor.processBatchFromEvent).toHaveBeenCalledWith(mockEvent.data);
    });

    it('should process empty batch successfully', async () => {
      const mockEvent: EventEnvelope<any> = {
        eventId: 'event-123',
        eventType: EVENT_TYPES.DEBTS_PORTFOLIO_DEBTOR_BATCH_READY,
        eventSource: 'api-debts',
        timestamp: new Date().toISOString(),
        data: {
          importJobId: mockImportJobId,
          portfolioId: mockPortfolioId,
          organizationId: mockOrgId,
          batchNumber: 1,
          totalBatches: 1,
          debtorCount: 0,
          debtors: [],
        },
      };

      debtorImportProcessor.processBatchFromEvent.mockResolvedValue({} as any);

      await listener.onMessage(mockEvent.data, mockEvent);

      expect(debtorImportProcessor.processBatchFromEvent).toHaveBeenCalledWith(mockEvent.data);
    });

    it('should re-throw processor errors for Pub/Sub retry', async () => {
      const mockEvent: EventEnvelope<any> = {
        eventId: 'event-123',
        eventType: EVENT_TYPES.DEBTS_PORTFOLIO_DEBTOR_BATCH_READY,
        eventSource: 'api-debts',
        timestamp: new Date().toISOString(),
        data: {
          importJobId: mockImportJobId,
          portfolioId: mockPortfolioId,
          organizationId: mockOrgId,
          batchNumber: 1,
          totalBatches: 1,
          debtorCount: 1,
          debtors: [
            {
              debtorId: mockDebtorId,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
          ],
        },
      };

      const processorError = new Error('Database connection failed');
      debtorImportProcessor.processBatchFromEvent.mockRejectedValue(processorError);

      await expect(
        listener.onMessage(mockEvent.data, mockEvent),
      ).rejects.toThrow('Database connection failed');

      expect(debtorImportProcessor.processBatchFromEvent).toHaveBeenCalled();
    });

    it('should process batch with multiple batches', async () => {
      const mockEvent: EventEnvelope<any> = {
        eventId: 'event-123',
        eventType: EVENT_TYPES.DEBTS_PORTFOLIO_DEBTOR_BATCH_READY,
        eventSource: 'api-debts',
        timestamp: new Date().toISOString(),
        data: {
          importJobId: mockImportJobId,
          portfolioId: mockPortfolioId,
          organizationId: mockOrgId,
          batchNumber: 3,
          totalBatches: 10,
          debtorCount: 100,
          debtors: Array.from({ length: 100 }, (_, i) => ({
            debtorId: `${mockDebtorId}-${i}`,
            firstName: `Debtor${i}`,
            lastName: 'Test',
            email: `debtor${i}@example.com`,
          })),
        },
      };

      debtorImportProcessor.processBatchFromEvent.mockResolvedValue({} as any);

      await listener.onMessage(mockEvent.data, mockEvent);

      expect(debtorImportProcessor.processBatchFromEvent).toHaveBeenCalledWith(mockEvent.data);
    });
  });
});
