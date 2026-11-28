import { Injectable, Logger } from '@nestjs/common';
import { EventOrchestratorClient } from '@verichron/event-orchestrator';
import { EVENT_TYPES, EVENT_TOPICS } from '@verichron/events';
import { DebtStatus } from '@verichron/enums';

export class DebtStatusQueryDto {
  organizationId: string;
  debtId: string;
}

export interface DebtStatusCheckResult {
  shouldExecute: boolean;
  status?: DebtStatus;
  reason: string;
}

/**
 * DebtVerificationService
 *
 * Verifies debt status before executing workflow actions (stop-work logic).
 *
 * ARCHITECTURE: api-automations is allowed to use EventOrchestratorClient
 * to query api-debts for real-time debt status.
 *
 * Terminal debt states that should SKIP actions:
 * - PAID_IN_FULL: Debt fully paid
 * - SETTLED: Debt settled for less than full amount
 * - SOLD: Debt sold to another agency
 * - CHARGED_OFF: Debt written off
 */
@Injectable()
export class DebtVerificationService {
  private readonly logger = new Logger(DebtVerificationService.name);

  // Terminal states where workflow actions should be skipped
  private readonly TERMINAL_STATES: DebtStatus[] = [
    DebtStatus.PAID_IN_FULL,
    DebtStatus.SETTLED,
    DebtStatus.SOLD,
    DebtStatus.CHARGED_OFF,
  ];

  constructor(
    private readonly orchestratorClient: EventOrchestratorClient,
  ) {}

  /**
   * Check if a workflow action should execute for a given debt
   *
   * @param organizationId - Organization ID
   * @param debtId - Debt ID to check
   * @returns DebtStatusCheckResult indicating whether to execute
   */
  async shouldExecuteWorkflowAction(
    organizationId: string,
    debtId: string,
  ): Promise<DebtStatusCheckResult> {
    this.logger.debug(
      `Checking debt status for workflow action: debt=${debtId}, org=${organizationId}`,
    );

    try {
      // Query debt status from api-debts via event orchestration
      const response = await this.orchestratorClient.request<
        { status: DebtStatus },
        DebtStatusQueryDto
      >(
        EVENT_TOPICS.DEBTS,
        EVENT_TYPES.DEBTS_DEBT_STATUS_QUERY_REQUESTED,
        {
          organizationId,
          debtId,
        },
        DebtStatusQueryDto,
        5000 // 5 second timeout
      );

      const status = response.status;

      // Check if debt is in terminal state
      if (this.TERMINAL_STATES.includes(status)) {
        this.logger.log(
          `⏸️  Debt ${debtId} is in terminal state (${status}), skipping workflow action`,
        );

        return {
          shouldExecute: false,
          status,
          reason: `Debt status is ${status} (terminal state)`,
        };
      }

      // Debt is in active state, proceed with action
      this.logger.debug(
        `✅ Debt ${debtId} is in active state (${status}), proceeding with workflow action`,
      );

      return {
        shouldExecute: true,
        status,
        reason: `Debt status is ${status} (active state)`,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to query debt status for debt ${debtId}: ${errorMessage}`,
      );

      // FAIL-OPEN: On error, allow execution (timeout or service unavailable)
      // This prevents workflow actions from being blocked by transient failures
      // For scheduled actions (delayed emails), this is acceptable risk
      this.logger.warn(
        `⚠️  Failed to verify debt status, defaulting to EXECUTE (fail-open policy)`,
      );

      return {
        shouldExecute: true,
        reason: `Verification failed (${errorMessage}), defaulting to execute (fail-open)`,
      };
    }
  }
}
