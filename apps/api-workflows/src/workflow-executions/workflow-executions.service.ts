import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowExecution, ActionExecution } from './entities/workflow-execution.entity';
import { WorkflowExecutionResponseDto } from './dto/workflow-execution-response.dto';
import { RequestContext } from '../core';
import { WorkflowExecutionStatus, WorkflowTargetEntityType, ActionExecutionStatus } from '@verichron/enums';

interface FindAllExecutionsParams {
  pageSize?: number;
  ruleId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class WorkflowExecutionsService {
  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly workflowExecutionRepository: Repository<WorkflowExecution>,
    private readonly requestContext: RequestContext,
  ) {}

  async findAll(
    organizationId: string,
    params: FindAllExecutionsParams,
  ): Promise<WorkflowExecutionResponseDto[]> {
    const { pageSize = 50, ruleId, status, startDate, endDate } = params;

    const queryBuilder = this.workflowExecutionRepository.createQueryBuilder('execution');

    queryBuilder.where('execution.organization_id = :organizationId', { organizationId });

    if (ruleId) {
      queryBuilder.andWhere('execution.rule_id = :ruleId', { ruleId });
    }
    if (status) {
      queryBuilder.andWhere('execution.status = :status', { status });
    }
    if (startDate) {
      queryBuilder.andWhere('execution.triggered_at >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      queryBuilder.andWhere('execution.triggered_at <= :endDate', { endDate: new Date(endDate) });
    }

    queryBuilder.orderBy('execution.triggered_at', 'DESC').limit(pageSize);

    const executions = await queryBuilder.getMany();
    return executions.map((execution) => new WorkflowExecutionResponseDto(execution));
  }

  async findOne(organizationId: string, executionId: string): Promise<WorkflowExecutionResponseDto> {
    const execution = await this.workflowExecutionRepository.findOne({
      where: { organizationId, id: executionId },
    });
    if (!execution) {
      throw new NotFoundException(
        `Workflow execution with ID "${executionId}" not found for organization "${organizationId}".`,
      );
    }
    return new WorkflowExecutionResponseDto(execution);
  }

  /**
   * Create a new workflow execution record
   * Called by EngineService after executing workflow actions
   */
  async createExecution(
    organizationId: string,
    ruleId: string | undefined,
    ruleName: string,
    triggeredBy: string,
    targetEntityType: WorkflowTargetEntityType,
    targetEntityId: string,
    targetEntityName: string | undefined,
    actionsExecuted: ActionExecution[],
    startTime: Date,
  ): Promise<WorkflowExecution> {
    // Calculate overall duration
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    // Determine overall status based on action results
    const allSuccess = actionsExecuted.every(
      (action) => action.status === ActionExecutionStatus.SUCCESS
    );
    const allFailed = actionsExecuted.every(
      (action) => action.status === ActionExecutionStatus.FAILED
    );
    const anyFailed = actionsExecuted.some(
      (action) => action.status === ActionExecutionStatus.FAILED
    );

    let status: WorkflowExecutionStatus;
    let errorMessage: string | undefined;

    if (allSuccess) {
      status = WorkflowExecutionStatus.COMPLETED;
    } else if (allFailed) {
      status = WorkflowExecutionStatus.FAILED;
      const errors = actionsExecuted
        .filter((a) => a.error)
        .map((a) => a.error)
        .join('; ');
      errorMessage = errors || 'All actions failed';
    } else if (anyFailed) {
      status = WorkflowExecutionStatus.PARTIAL;
      const errors = actionsExecuted
        .filter((a) => a.error)
        .map((a) => `${a.actionType}: ${a.error}`)
        .join('; ');
      errorMessage = `Some actions failed: ${errors}`;
    } else {
      status = WorkflowExecutionStatus.COMPLETED;
    }

    // Create execution record
    const execution = this.workflowExecutionRepository.create({
      organizationId,
      ruleId,
      ruleName,
      triggeredBy,
      targetEntityType,
      targetEntityId,
      targetEntityName,
      actionsExecuted,
      status,
      durationMs,
      errorMessage,
      triggeredAt: startTime,
    });

    return await this.workflowExecutionRepository.save(execution);
  }

  /**
   * Log a skipped workflow action
   *
   * Called by SchedulerProcessor when a delayed action is skipped due to stop-work logic
   * (e.g., debt paid before action executes)
   *
   * @param organizationId - Organization ID
   * @param ruleId - Workflow rule ID
   * @param ruleName - Workflow rule name
   * @param targetEntityId - Target entity ID (e.g., debt ID)
   * @param action - The action that was skipped
   * @param skipReason - Reason why the action was skipped
   */
  async logSkippedAction(
    organizationId: string,
    ruleId: string,
    ruleName: string,
    targetEntityId: string,
    action: any,
    skipReason: string,
  ): Promise<void> {
    const execution = this.workflowExecutionRepository.create({
      organizationId,
      ruleId,
      ruleName,
      triggeredBy: 'scheduler',
      targetEntityType: WorkflowTargetEntityType.DEBT,
      targetEntityId,
      targetEntityName: undefined,
      status: WorkflowExecutionStatus.SKIPPED,
      actionsExecuted: [
        {
          actionId: action.id || 'unknown',
          actionType: action.type,
          status: ActionExecutionStatus.SKIPPED,
          executedAt: new Date(),
          result: skipReason,
          error: undefined,
          duration: 0,
        },
      ],
      triggeredAt: new Date(),
      durationMs: 0,
      errorMessage: undefined,
      correlationId: undefined,
    });

    await this.workflowExecutionRepository.save(execution);
  }
}