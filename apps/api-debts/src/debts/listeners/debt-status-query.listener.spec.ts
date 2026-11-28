import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { DebtStatusQueryListener } from './debt-status-query.listener';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt } from '../entities/debt.entity';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TOPICS, EVENT_TYPES, EVENT_SOURCES, type EventEnvelope } from '@verichron/events';
import { DebtStatus } from '@verichron/enums';
import { DebtStatusQueryRequestedDto, DebtStatusQueryResponseDto } from '../../events/event-dto/debts';

describe('DebtStatusQueryListener', () => {
  let listener: DebtStatusQueryListener;
  let debtRepository: jest.Mocked<Repository<Debt>>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const mockOrganizationId = 'org-123';
  const mockDebtId = 'debt-456';
  const mockCorrelationId = 'corr-789';

  const createMockEnvelope = (data: DebtStatusQueryRequestedDto, correlationId?: string): EventEnvelope<DebtStatusQueryRequestedDto> => ({
    eventId: 'evt-123',
    eventType: EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_REQUESTED,
    eventSource: EVENT_SOURCES.AUTOMATIONS,
    timestamp: new Date().toISOString(),
    correlationId: correlationId || mockCorrelationId,
    data,
  });

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        DebtStatusQueryListener,
        {
          provide: getRepositoryToken(Debt),
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

    listener = module.get<DebtStatusQueryListener>(DebtStatusQueryListener);
    debtRepository = module.get(getRepositoryToken(Debt)) as jest.Mocked<Repository<Debt>>;
    eventPublisher = module.get(EventPublisher) as jest.Mocked<EventPublisher>;
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('onMessage', () => {
    describe('Successful Queries', () => {
      it('should respond with debt status for existing debt', async () => {
        const mockDebt = {
          id: mockDebtId,
          organizationId: mockOrganizationId,
          status: DebtStatus.ACTIVE,
        } as Debt;

        debtRepository.findOne.mockResolvedValue(mockDebt);

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        await listener.onMessage(data, createMockEnvelope(data));

        expect(debtRepository.findOne).toHaveBeenCalledWith({
          where: {
            id: mockDebtId,
            organizationId: mockOrganizationId,
          },
          select: ['id', 'status', 'organizationId'],
        });

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_RESPONSE,
          {
            status: DebtStatus.ACTIVE,
            debtId: mockDebtId,
            organizationId: mockOrganizationId,
          },
          DebtStatusQueryResponseDto,
          { correlationId: mockCorrelationId },
        );
      });

      it('should respond with PAID_IN_FULL status for paid debt', async () => {
        const mockDebt = {
          id: mockDebtId,
          organizationId: mockOrganizationId,
          status: DebtStatus.PAID_IN_FULL,
        } as Debt;

        debtRepository.findOne.mockResolvedValue(mockDebt);

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        await listener.onMessage(data, createMockEnvelope(data));

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_RESPONSE,
          expect.objectContaining({
            status: DebtStatus.PAID_IN_FULL,
          }),
          DebtStatusQueryResponseDto,
          { correlationId: mockCorrelationId },
        );
      });

      it('should use only required fields for performance', async () => {
        const mockDebt = {
          id: mockDebtId,
          organizationId: mockOrganizationId,
          status: DebtStatus.IN_COLLECTION,
        } as Debt;

        debtRepository.findOne.mockResolvedValue(mockDebt);

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        await listener.onMessage(data, createMockEnvelope(data));

        // Verify only required fields are selected
        expect(debtRepository.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            select: ['id', 'status', 'organizationId'],
          }),
        );
      });
    });

    describe('Debt Not Found (Fail-Open)', () => {
      it('should respond with ACTIVE status when debt not found', async () => {
        debtRepository.findOne.mockResolvedValue(null);

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        await listener.onMessage(data, createMockEnvelope(data));

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_RESPONSE,
          {
            status: DebtStatus.ACTIVE,
            debtId: mockDebtId,
            organizationId: mockOrganizationId,
          },
          DebtStatusQueryResponseDto,
          { correlationId: mockCorrelationId },
        );
      });

      it('should log warning when debt not found', async () => {
        debtRepository.findOne.mockResolvedValue(null);

        const loggerWarnSpy = jest.spyOn(listener['logger'], 'warn');

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        await listener.onMessage(data, createMockEnvelope(data));

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Debt not found: debtId=${mockDebtId}`),
        );
      });
    });

    describe('Error Handling (Fail-Open)', () => {
      it('should respond with ACTIVE status on database error', async () => {
        debtRepository.findOne.mockRejectedValue(new Error('Database connection lost'));

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        await listener.onMessage(data, createMockEnvelope(data));

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_RESPONSE,
          {
            status: DebtStatus.ACTIVE,
            debtId: mockDebtId,
            organizationId: mockOrganizationId,
          },
          DebtStatusQueryResponseDto,
          { correlationId: mockCorrelationId },
        );
      });

      it('should log error on database failure', async () => {
        const errorMessage = 'Connection timeout';
        debtRepository.findOne.mockRejectedValue(new Error(errorMessage));

        const loggerErrorSpy = jest.spyOn(listener['logger'], 'error');

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        await listener.onMessage(data, createMockEnvelope(data));

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Failed to query debt status: debtId=${mockDebtId}`),
        );
      });

      it('should handle non-Error exceptions', async () => {
        debtRepository.findOne.mockRejectedValue('String error');

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        await listener.onMessage(data, createMockEnvelope(data));

        // Should still publish response with ACTIVE status
        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_RESPONSE,
          expect.objectContaining({
            status: DebtStatus.ACTIVE,
          }),
          DebtStatusQueryResponseDto,
          { correlationId: mockCorrelationId },
        );
      });

      it('should not throw exception on error (fail-open)', async () => {
        debtRepository.findOne.mockRejectedValue(new Error('Fatal error'));

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        // Should not throw
        await expect(
          listener.onMessage(data, createMockEnvelope(data)),
        ).resolves.not.toThrow();
      });
    });

    describe('Correlation ID Handling', () => {
      it('should preserve correlationId in response', async () => {
        const customCorrelationId = 'custom-corr-id-123';
        const mockDebt = {
          id: mockDebtId,
          organizationId: mockOrganizationId,
          status: DebtStatus.ACTIVE,
        } as Debt;

        debtRepository.findOne.mockResolvedValue(mockDebt);

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        await listener.onMessage(data, createMockEnvelope(data, customCorrelationId));

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_RESPONSE,
          expect.anything(),
          DebtStatusQueryResponseDto,
          { correlationId: customCorrelationId },
        );
      });

      it('should handle missing correlationId', async () => {
        const mockDebt = {
          id: mockDebtId,
          organizationId: mockOrganizationId,
          status: DebtStatus.ACTIVE,
        } as Debt;

        debtRepository.findOne.mockResolvedValue(mockDebt);

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        const envelopeWithoutCorrelation = createMockEnvelope(data);
        envelopeWithoutCorrelation.correlationId = undefined;

        await listener.onMessage(data, envelopeWithoutCorrelation);

        // Should still work, even without correlationId
        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_RESPONSE,
          expect.anything(),
          DebtStatusQueryResponseDto,
          { correlationId: undefined },
        );
      });
    });

    describe('Response Publication', () => {
      it('should publish to correct event type', async () => {
        const mockDebt = {
          id: mockDebtId,
          organizationId: mockOrganizationId,
          status: DebtStatus.SETTLED,
        } as Debt;

        debtRepository.findOne.mockResolvedValue(mockDebt);

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        await listener.onMessage(data, createMockEnvelope(data));

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_RESPONSE,
          expect.anything(),
          DebtStatusQueryResponseDto,
          expect.anything(),
        );
      });

      it('should include all required fields in response', async () => {
        const mockDebt = {
          id: mockDebtId,
          organizationId: mockOrganizationId,
          status: DebtStatus.SOLD,
        } as Debt;

        debtRepository.findOne.mockResolvedValue(mockDebt);

        const data = {
          organizationId: mockOrganizationId,
          debtId: mockDebtId,
        };

        await listener.onMessage(data, createMockEnvelope(data));

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_RESPONSE,
          {
            status: DebtStatus.SOLD,
            debtId: mockDebtId,
            organizationId: mockOrganizationId,
          },
          DebtStatusQueryResponseDto,
          { correlationId: mockCorrelationId },
        );
      });
    });
  });
});
