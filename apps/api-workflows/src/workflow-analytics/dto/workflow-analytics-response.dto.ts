import { ApiProperty } from '@nestjs/swagger';
import { TopPerformingRuleDto } from './top-performing-rule.dto';
import { WorkflowExecutionResponseDto } from '../../workflow-executions/dto/workflow-execution-response.dto';
import { DailyExecutionStatsDto } from './daily-execution-stats.dto';

export class WorkflowAnalyticsResponseDto {
  @ApiProperty({
    description: 'Total number of workflow rules defined',
    example: 10,
  })
  totalRules: number;

  @ApiProperty({
    description: 'Number of currently active/enabled workflow rules',
    example: 8,
  })
  activeRules: number;

  @ApiProperty({
    description: 'Total number of workflow executions in the period',
    example: 1500,
  })
  totalExecutions: number;

  @ApiProperty({
    description: 'Overall success rate of workflow executions in the period (0-100%)',
    example: 98.5,
  })
  successRate: number;

  @ApiProperty({
    description: 'List of top-performing workflow rules by success rate or execution count',
    type: [TopPerformingRuleDto],
  })
  topPerformingRules: TopPerformingRuleDto[];

  @ApiProperty({
    description: 'List of most recent workflow executions',
    type: [WorkflowExecutionResponseDto],
  })
  recentExecutions: WorkflowExecutionResponseDto[];

  @ApiProperty({
    description: 'Daily statistics for workflow executions over the period',
    type: [DailyExecutionStatsDto],
  })
  executionsByDay: DailyExecutionStatsDto[];
}
