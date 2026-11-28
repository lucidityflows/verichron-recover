import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { WorkflowActionResultListener } from './workflow-action-result.listener';
import { WorkflowExecutionsService } from '../workflow-executions.service';
import { EVENT_TOPICS, EVENT_TYPES, EVENT_SOURCES, type EventEnvelope, type EventType } from '@verichron/events';
import {
  WorkflowActionCompletedDto,
  WorkflowActionFailedDto,
  WorkflowActionSkippedDto,
} from '../../events/event-dto';

describe('WorkflowActionResultListener', () => {
  let listener: WorkflowActionResultListener;
  let workflowExecutionsService: jest.Mocked<WorkflowExecutionsService>;

  const mockOrganizationId = 'org-123';
  const mockRuleId = 'rule-456';
  const mockRuleName = 'Test Dunning Workflow';
  const mockTargetEntityId = 'debt-789';
  const mockActionType = 'SEND_EMAIL';
  const mockCorrelationId = 'corr-abc';

  const createMockEnvelope = <T>(
    eventType: EventType,
    data: T,
  ): EventEnvelope<T> => ({
    eventId: 'evt-123',
    eventType,
    eventSource: EVENT_SOURCES.AUTOMATIONS,
    timestamp: new Date().toISOString(),
    correlationId: mockCorrelationId,
    data,
  });

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        WorkflowActionResultListener,
        {
          provide: WorkflowExecutionsService,
          useValue: {
            logSkippedAction: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get<WorkflowActionResultListener>(
      WorkflowActionResultListener,
    );
    workflowExecutionsService = module.get(
      WorkflowExecutionsService,
    ) as jest.Mocked<WorkflowExecutionsService>;
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('onMessage', () => {
    describe('WORKFLOWS_ACTION_COMPLETED', () => {
      it('should log completed action', async () => {
        const data: WorkflowActionCompletedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          result: 'Email sent successfully',
          durationMs: 250,
          correlationId: mockCorrelationId,
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_COMPLETED,
          data,
        );

        const loggerLogSpy = jest.spyOn(listener['logger'], 'log');

        await listener.onMessage(data, envelope);

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('✅ Workflow action completed'),
        );
        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(mockRuleName),
        );
        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(mockActionType),
        );
        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(mockTargetEntityId),
        );
      });

      it('should not call logSkippedAction for completed actions', async () => {
        const data: WorkflowActionCompletedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          result: 'Success',
          durationMs: 100,
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_COMPLETED,
          data,
        );

        await listener.onMessage(data, envelope);

        expect(workflowExecutionsService.logSkippedAction).not.toHaveBeenCalled();
      });
    });

    describe('WORKFLOWS_ACTION_FAILED', () => {
      it('should log failed action with error', async () => {
        const data: WorkflowActionFailedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          error: 'SMTP server unavailable',
          durationMs: 5000,
          correlationId: mockCorrelationId,
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_FAILED,
          data,
        );

        const loggerWarnSpy = jest.spyOn(listener['logger'], 'warn');

        await listener.onMessage(data, envelope);

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('❌ Workflow action failed'),
        );
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(mockRuleName),
        );
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(mockActionType),
        );
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('SMTP server unavailable'),
        );
      });

      it('should not call logSkippedAction for failed actions', async () => {
        const data: WorkflowActionFailedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          error: 'Network error',
          durationMs: 3000,
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_FAILED,
          data,
        );

        await listener.onMessage(data, envelope);

        expect(workflowExecutionsService.logSkippedAction).not.toHaveBeenCalled();
      });
    });

    describe('WORKFLOWS_ACTION_SKIPPED', () => {
      it('should log skipped action and call logSkippedAction', async () => {
        const skipReason = 'Debt status is PAID_IN_FULL (terminal state)';
        const data: WorkflowActionSkippedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          skipReason,
          correlationId: mockCorrelationId,
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_SKIPPED,
          data,
        );

        const loggerLogSpy = jest.spyOn(listener['logger'], 'log');

        await listener.onMessage(data, envelope);

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('⏸️  Workflow action skipped'),
        );
        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(mockRuleName),
        );
        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(mockActionType),
        );
        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(skipReason),
        );

        expect(workflowExecutionsService.logSkippedAction).toHaveBeenCalledWith(
          mockOrganizationId,
          mockRuleId,
          mockRuleName,
          mockTargetEntityId,
          { type: mockActionType },
          skipReason,
        );
      });

      it('should create minimal action object for logSkippedAction', async () => {
        const data: WorkflowActionSkippedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: 'CREATE_TASK',
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          skipReason: 'Debt in terminal state',
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_SKIPPED,
          data,
        );

        await listener.onMessage(data, envelope);

        expect(workflowExecutionsService.logSkippedAction).toHaveBeenCalledWith(
          mockOrganizationId,
          mockRuleId,
          mockRuleName,
          mockTargetEntityId,
          { type: 'CREATE_TASK' },
          'Debt in terminal state',
        );
      });

      it('should handle SKIPPED action with PAID_IN_FULL reason', async () => {
        const data: WorkflowActionSkippedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          skipReason: 'Debt status is PAID_IN_FULL (terminal state)',
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_SKIPPED,
          data,
        );

        await listener.onMessage(data, envelope);

        expect(workflowExecutionsService.logSkippedAction).toHaveBeenCalled();
        const callArgs = workflowExecutionsService.logSkippedAction.mock.calls[0];
        expect(callArgs[5]).toContain('PAID_IN_FULL');
      });

      it('should handle SKIPPED action with SETTLED reason', async () => {
        const data: WorkflowActionSkippedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          skipReason: 'Debt status is SETTLED (terminal state)',
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_SKIPPED,
          data,
        );

        await listener.onMessage(data, envelope);

        expect(workflowExecutionsService.logSkippedAction).toHaveBeenCalled();
        const callArgs = workflowExecutionsService.logSkippedAction.mock.calls[0];
        expect(callArgs[5]).toContain('SETTLED');
      });
    });

    describe('Event Type Routing', () => {
      it('should route COMPLETED events to handleCompleted', async () => {
        const data: WorkflowActionCompletedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          result: 'Success',
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_COMPLETED,
          data,
        );

        const loggerLogSpy = jest.spyOn(listener['logger'], 'log');

        await listener.onMessage(data, envelope);

        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('✅ Workflow action completed'),
        );
      });

      it('should route FAILED events to handleFailed', async () => {
        const data: WorkflowActionFailedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          error: 'Error',
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_FAILED,
          data,
        );

        const loggerWarnSpy = jest.spyOn(listener['logger'], 'warn');

        await listener.onMessage(data, envelope);

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('❌ Workflow action failed'),
        );
      });

      it('should route SKIPPED events to handleSkipped', async () => {
        const data: WorkflowActionSkippedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          skipReason: 'Reason',
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_SKIPPED,
          data,
        );

        await listener.onMessage(data, envelope);

        expect(workflowExecutionsService.logSkippedAction).toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      it('should handle optional fields in COMPLETED event', async () => {
        const data: WorkflowActionCompletedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          // Optional fields omitted
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_COMPLETED,
          data,
        );

        await expect(
          listener.onMessage(data, envelope),
        ).resolves.not.toThrow();
      });

      it('should handle missing correlationId', async () => {
        const data: WorkflowActionSkippedDto = {
          organizationId: mockOrganizationId,
          ruleId: mockRuleId,
          ruleName: mockRuleName,
          actionType: mockActionType,
          targetEntityId: mockTargetEntityId,
          targetEntityType: 'DEBT',
          skipReason: 'Reason',
        };

        const envelope = createMockEnvelope(
          EVENT_TYPES.WORKFLOWS_ACTION_SKIPPED,
          data,
        );
        envelope.correlationId = undefined;

        await expect(
          listener.onMessage(data, envelope),
        ).resolves.not.toThrow();
      });
    });
  });
});
