import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WorkflowExecutionResponseDto } from '../workflow-executions/dto/workflow-execution-response.dto';
import { WorkflowExecution } from '../workflow-executions/entities/workflow-execution.entity';
import { WorkflowRule } from '../workflow-rules/entities/workflow-rule.entity';
import { WorkflowAnalyticsResponseDto } from './dto/workflow-analytics-response.dto';
import { TopPerformingRuleDto } from './dto/top-performing-rule.dto';
import { DailyExecutionStatsDto } from './dto/daily-execution-stats.dto';
import { WorkflowExecutionStatus } from '@verichron/enums';
import { subDays, format, parseISO } from 'date-fns';

@Injectable()
export class WorkflowAnalyticsService {
  constructor(
    @InjectRepository(WorkflowExecution)
    private readonly workflowExecutionRepository: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowRule)
    private readonly workflowRuleRepository: Repository<WorkflowRule>,
  ) {}

  async getAnalytics(
    organizationId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<WorkflowAnalyticsResponseDto> {
    const defaultEndDate = new Date();
    const defaultStartDate = subDays(defaultEndDate, 30);

    const periodStart = startDate ? parseISO(startDate) : defaultStartDate;
    const periodEnd = endDate ? parseISO(endDate) : defaultEndDate;

    const [totalRules, activeRules] = await Promise.all([
      this.workflowRuleRepository.count({ where: { organizationId } }),
      this.workflowRuleRepository.count({ where: { organizationId, enabled: true } }),
    ]);

    const executionsInPeriod = await this.workflowExecutionRepository.find({
      where: {
        organizationId,
        triggeredAt: Between(periodStart, periodEnd),
      },
    });

    const totalExecutions = executionsInPeriod.length;
    const successfulExecutions = executionsInPeriod.filter(
      (exec) => exec.status === WorkflowExecutionStatus.COMPLETED,
    ).length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    const topPerformingRules = this.calculateTopPerformingRules(executionsInPeriod);
    const recentExecutions = executionsInPeriod
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, 10)
      .map((exec) => new WorkflowExecutionResponseDto(exec)); // Assuming constructor for DTO

    const executionsByDay = this.calculateDailyExecutionStats(executionsInPeriod, periodStart, periodEnd);

    return {
      totalRules,
      activeRules,
      totalExecutions,
      successRate,
      topPerformingRules,
      recentExecutions,
      executionsByDay,
    };
  }

  private calculateTopPerformingRules(executions: WorkflowExecution[]): TopPerformingRuleDto[] {
    const ruleStats: Record<string, {
        ruleName: string;
        executionCount: number;
        successfulExecutions: number;
        totalDuration: number;
      }> = {};

    for (const exec of executions) {
      if (!exec.ruleId) { // Skip if ruleId is undefined or null
        continue;
      }
      if (!ruleStats[exec.ruleId]) {
        ruleStats[exec.ruleId] = {
          ruleName: exec.ruleName,
          executionCount: 0,
          successfulExecutions: 0,
          totalDuration: 0,
        };
      }
      ruleStats[exec.ruleId].executionCount++;
      if (exec.status === WorkflowExecutionStatus.COMPLETED) {
        ruleStats[exec.ruleId].successfulExecutions++;
      }
      ruleStats[exec.ruleId].totalDuration += exec.durationMs || 0;
    }

    return Object.entries(ruleStats)
      .map(([ruleId, stats]) => ({
        ruleId,
        ruleName: stats.ruleName,
        executionCount: stats.executionCount,
        successRate: (stats.successfulExecutions / stats.executionCount) * 100,
        avgDuration: stats.totalDuration / stats.executionCount,
      }))
      .sort((a, b) => b.executionCount - a.executionCount || b.successRate - a.successRate)
      .slice(0, 5); // Top 5
  }

  private calculateDailyExecutionStats(
    executions: WorkflowExecution[],
    periodStart: Date,
    periodEnd: Date,
  ): DailyExecutionStatsDto[] {
    const dailyStats: Record<string, { executions: number; successes: number; failures: number }> = {};

    // Initialize all days in the period
    const currentDate = new Date(periodStart);
    while (currentDate <= periodEnd) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      dailyStats[dateKey] = { executions: 0, successes: 0, failures: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const exec of executions) {
      const dateKey = format(exec.triggeredAt, 'yyyy-MM-dd');
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].executions++;
        if (exec.status === WorkflowExecutionStatus.COMPLETED) {
          dailyStats[dateKey].successes++;
        } else if (exec.status === WorkflowExecutionStatus.FAILED) {
          dailyStats[dateKey].failures++;
        }
      }
    }

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        executions: stats.executions,
        successes: stats.successes,
        failures: stats.failures,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
