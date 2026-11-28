import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { DebtVerificationService, DebtStatusCheckResult, DebtStatusQueryDto } from './debt-verification.service';
import { EVENT_TYPES, EVENT_TOPICS } from '@verichron/events';
import { DebtStatus } from '@verichron/enums';

// Mock the event-orchestrator module to avoid uuid ESM issues
jest.mock('@verichron/event-orchestrator', () => ({
  EventOrchestratorClient: jest.fn().mockImplementation(() => ({
    request: jest.fn(),
  })),
}));

import { EventOrchestratorClient } from '@verichron/event-orchestrator';

describe('DebtVerificationService', () => {
  let service: DebtVerificationService;
  let orchestratorClient: jest.Mocked<EventOrchestratorClient>;

  const mockOrganizationId = 'org-123';
  const mockDebtId = 'debt-456';

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        DebtVerificationService,
        {
          provide: EventOrchestratorClient,
          useValue: {
            request: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DebtVerificationService>(DebtVerificationService);
    orchestratorClient = module.get(EventOrchestratorClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shouldExecuteWorkflowAction', () => {
    describe('Terminal States (shouldExecute: false)', () => {
      it('should return shouldExecute=false for PAID_IN_FULL status', async () => {
        orchestratorClient.request.mockResolvedValue({
          status: DebtStatus.PAID_IN_FULL,
        });

        const result: DebtStatusCheckResult = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        expect(result.shouldExecute).toBe(false);
        expect(result.status).toBe(DebtStatus.PAID_IN_FULL);
        expect(result.reason).toContain('PAID_IN_FULL');
        expect(result.reason).toContain('terminal state');
        expect(orchestratorClient.request).toHaveBeenCalledWith(
          EVENT_TOPICS.DEBTS,
          EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_REQUESTED,
          {
            organizationId: mockOrganizationId,
            debtId: mockDebtId,
          },
          DebtStatusQueryDto,
          5000,
        );
      });

      it('should return shouldExecute=false for SETTLED status', async () => {
        orchestratorClient.request.mockResolvedValue({
          status: DebtStatus.SETTLED,
        });

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        expect(result.shouldExecute).toBe(false);
        expect(result.status).toBe(DebtStatus.SETTLED);
        expect(result.reason).toContain('SETTLED');
      });

      it('should return shouldExecute=false for SOLD status', async () => {
        orchestratorClient.request.mockResolvedValue({
          status: DebtStatus.SOLD,
        });

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        expect(result.shouldExecute).toBe(false);
        expect(result.status).toBe(DebtStatus.SOLD);
        expect(result.reason).toContain('SOLD');
      });

      it('should return shouldExecute=false for CHARGED_OFF status', async () => {
        orchestratorClient.request.mockResolvedValue({
          status: DebtStatus.CHARGED_OFF,
        });

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        expect(result.shouldExecute).toBe(false);
        expect(result.status).toBe(DebtStatus.CHARGED_OFF);
        expect(result.reason).toContain('CHARGED_OFF');
      });
    });

    describe('Active States (shouldExecute: true)', () => {
      it('should return shouldExecute=true for ACTIVE status', async () => {
        orchestratorClient.request.mockResolvedValue({
          status: DebtStatus.ACTIVE,
        });

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        expect(result.shouldExecute).toBe(true);
        expect(result.status).toBe(DebtStatus.ACTIVE);
        expect(result.reason).toContain('ACTIVE');
        expect(result.reason).toContain('active state');
      });

      it('should return shouldExecute=true for IN_COLLECTION status', async () => {
        orchestratorClient.request.mockResolvedValue({
          status: DebtStatus.IN_COLLECTION,
        });

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        expect(result.shouldExecute).toBe(true);
        expect(result.status).toBe(DebtStatus.IN_COLLECTION);
      });

      it('should return shouldExecute=true for PAYMENT_PLAN status', async () => {
        orchestratorClient.request.mockResolvedValue({
          status: DebtStatus.PAYMENT_PLAN,
        });

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        expect(result.shouldExecute).toBe(true);
        expect(result.status).toBe(DebtStatus.PAYMENT_PLAN);
      });
    });

    describe('Error Handling (Fail-Open Policy)', () => {
      it('should return shouldExecute=true on orchestrator timeout', async () => {
        orchestratorClient.request.mockRejectedValue(new Error('Timeout exceeded'));

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        expect(result.shouldExecute).toBe(true);
        expect(result.reason).toContain('Timeout exceeded');
        expect(result.reason).toContain('fail-open');
      });

      it('should return shouldExecute=true on orchestrator network error', async () => {
        orchestratorClient.request.mockRejectedValue(new Error('Network unavailable'));

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        expect(result.shouldExecute).toBe(true);
        expect(result.reason).toContain('Network unavailable');
      });

      it('should return shouldExecute=true on orchestrator rejection', async () => {
        orchestratorClient.request.mockRejectedValue(new Error('Service unavailable'));

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        expect(result.shouldExecute).toBe(true);
        expect(result.reason).toContain('Service unavailable');
      });

      it('should handle non-Error exceptions gracefully', async () => {
        orchestratorClient.request.mockRejectedValue('String error');

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        expect(result.shouldExecute).toBe(true);
        expect(result.reason).toContain('String error');
      });
    });

    describe('Orchestrator Integration', () => {
      it('should call orchestrator with correct parameters', async () => {
        orchestratorClient.request.mockResolvedValue({
          status: DebtStatus.ACTIVE,
        });

        await service.shouldExecuteWorkflowAction(mockOrganizationId, mockDebtId);

        expect(orchestratorClient.request).toHaveBeenCalledTimes(1);
        expect(orchestratorClient.request).toHaveBeenCalledWith(
          EVENT_TOPICS.DEBTS,
          EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_REQUESTED,
          {
            organizationId: mockOrganizationId,
            debtId: mockDebtId,
          },
          DebtStatusQueryDto,
          5000,
        );
      });

      it('should use 5-second timeout for orchestrator queries', async () => {
        orchestratorClient.request.mockResolvedValue({
          status: DebtStatus.ACTIVE,
        });

        await service.shouldExecuteWorkflowAction(mockOrganizationId, mockDebtId);

        const callArgs = orchestratorClient.request.mock.calls[0];
        expect(callArgs[4]).toBe(5000);
      });
    });

    describe('Edge Cases', () => {
      it('should handle unknown debt status gracefully', async () => {
        orchestratorClient.request.mockResolvedValue({
          status: 'UNKNOWN_STATUS' as DebtStatus,
        });

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        // Unknown statuses are not in terminal states list, so should execute
        expect(result.shouldExecute).toBe(true);
        expect(result.status).toBe('UNKNOWN_STATUS');
      });

      it('should handle missing status in response', async () => {
        orchestratorClient.request.mockResolvedValue({});

        const result = await service.shouldExecuteWorkflowAction(
          mockOrganizationId,
          mockDebtId,
        );

        // Missing status should be treated as non-terminal (execute)
        expect(result.shouldExecute).toBe(true);
      });
    });
  });
});
