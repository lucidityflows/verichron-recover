import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const WORKFLOW_QUEUE_NAME = 'workflow-queue';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(WORKFLOW_QUEUE_NAME) private readonly workflowQueue: Queue,
  ) {}

  async addRuleEvaluationJob(organizationId: string, ruleId: string, delayMs = 0): Promise<void> {
    const jobId = `rule-evaluation:${organizationId}:${ruleId}`;
    await this.workflowQueue.add(
      'evaluate-rule', // Job name
      { organizationId, ruleId },
      {
        jobId,
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3, // Retry failed jobs
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
    this.logger.debug(`Added rule evaluation job ${jobId} with delay ${delayMs}ms`);
  }

  async addAutoAssignmentJob(organizationId: string, configId: string, delayMs = 0): Promise<void> {
    const jobId = `auto-assignment:${organizationId}:${configId}`;
    await this.workflowQueue.add(
      'run-auto-assignment',
      { organizationId, configId },
      {
        jobId,
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
    this.logger.debug(`Added auto-assignment job ${jobId} with delay ${delayMs}ms`);
  }

  async addEscalationJob(organizationId: string, ruleId: string, targetEntityId: string, delayMs = 0): Promise<void> {
    const jobId = `escalation:${organizationId}:${ruleId}:${targetEntityId}`;
    await this.workflowQueue.add(
      'run-escalation',
      { organizationId, ruleId, targetEntityId },
      {
        jobId,
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
    this.logger.debug(`Added escalation job ${jobId} with delay ${delayMs}ms`);
  }

  /**
   * Schedule a specific workflow action to be executed after a delay
   */
  async addWorkflowActionJob(
    organizationId: string,
    ruleId: string,
    ruleName: string,
    action: any,
    targetEntityId: string,
    targetEntityType: string,
    eventPayload: any,
    delayMs: number,
  ): Promise<void> {
    const jobId = `workflow-action:${organizationId}:${ruleId}:${action.id}:${targetEntityId}`;
    await this.workflowQueue.add(
      'execute-workflow-action',
      {
        organizationId,
        ruleId,
        ruleName,
        action,
        targetEntityId,
        targetEntityType,
        eventPayload,
      },
      {
        jobId,
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
    this.logger.debug(`Scheduled workflow action job ${jobId} with delay ${delayMs}ms`);
  }

  /**
   * Schedule delayed auto-assignment execution
   */
  async scheduleAutoAssignment(
    organizationId: string,
    configId: string,
    targetEntityId: string,
    targetEntityType: string,
    targetEntityData: any,
    delayMs: number,
    correlationId?: string,
  ): Promise<void> {
    const jobId = `auto-assignment:${organizationId}:${configId}:${targetEntityId}`;
    await this.workflowQueue.add(
      'execute-auto-assignment',
      {
        organizationId,
        configId,
        targetEntityId,
        targetEntityType,
        targetEntityData,
        correlationId,
      },
      {
        jobId,
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
    this.logger.debug(`Scheduled auto-assignment job ${jobId} with delay ${delayMs}ms`);
  }

  // Generic method to add a delayed job
  async addDelayedJob<T>(name: string, data: T, delayMs: number, jobId?: string): Promise<void> {
    await this.workflowQueue.add(name, data, {
      jobId: jobId || `${name}:${Date.now()}`,
      delay: delayMs,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
    this.logger.debug(`Added delayed job '${name}' with ID '${jobId}' for ${delayMs}ms`);
  }
}
