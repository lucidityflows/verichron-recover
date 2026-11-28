import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  WorkflowExecutionStatus,
  WorkflowTargetEntityType,
  ActionExecutionStatus,
} from '@verichron/enums';
import { WorkflowExecution } from '../entities/workflow-execution.entity';

// Helper DTO for ActionExecution (for OpenAPI nested array)
class ActionExecutionResponseDto {
  @ApiProperty({
    description: 'ID of the action in the WorkflowRule',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  actionId: string;

  @ApiProperty({
    description: 'Type of action performed',
    example: 'ASSIGN_TO_COLLECTOR',
  })
  actionType: string;

  @ApiProperty({
    description: 'Status of the action execution',
    enum: ActionExecutionStatus,
    example: ActionExecutionStatus.SUCCESS,
  })
  status: ActionExecutionStatus;

  @ApiPropertyOptional({
    description: 'Short summary of the action\'s outcome',
    example: 'Assigned to John Doe',
  })
  result?: string;

  @ApiPropertyOptional({
    description: 'Error message if action failed',
    example: 'Collector not found',
  })
  error?: string;

  @ApiProperty({
    description: 'Timestamp when the action was executed',
    example: '2023-10-27T10:00:00.000Z',
  })
  executedAt: Date;

  @ApiPropertyOptional({
    description: 'Duration of the action execution in milliseconds',
    example: 120,
  })
  duration?: number;
}

export class WorkflowExecutionResponseDto {
  @ApiProperty({
    description: 'Unique ID of the workflow execution record',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the organization this execution belongs to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  organizationId: string;

  @ApiPropertyOptional({
    description: 'ID of the workflow rule that triggered this execution',
    example: 'b1c2d3e4-f5a6-7890-1234-567890abcdef',
  })
  ruleId?: string;

  @ApiProperty({
    description: 'Name of the workflow rule that triggered this execution',
    example: 'High Balance Escalation',
  })
  ruleName: string;

  @ApiProperty({
    description: 'Timestamp when the workflow was triggered',
    example: '2023-10-27T10:00:00.000Z',
  })
  triggeredAt: Date;

  @ApiProperty({
    description: 'Who or what triggered the workflow (e.g., "system" or userId)',
    example: 'system',
  })
  triggeredBy: string;

  @ApiProperty({
    description: 'Type of entity targeted by this workflow',
    enum: WorkflowTargetEntityType,
    example: WorkflowTargetEntityType.DEBTOR,
  })
  targetEntityType: WorkflowTargetEntityType;

  @ApiProperty({
    description: 'ID of the target entity',
    example: 'c1d2e3f4-a5b6-7890-1234-567890abcdef',
  })
  targetEntityId: string;

  @ApiPropertyOptional({
    description: 'Name of the target entity for display purposes',
    example: 'John Doe',
  })
  targetEntityName?: string;

  @ApiProperty({
    description: 'List of actions executed as part of this workflow',
    type: [ActionExecutionResponseDto],
  })
  actionsExecuted: ActionExecutionResponseDto[];

  @ApiProperty({
    description: 'Overall status of the workflow execution',
    enum: WorkflowExecutionStatus,
    example: WorkflowExecutionStatus.COMPLETED,
  })
  status: WorkflowExecutionStatus;

  @ApiPropertyOptional({
    description: 'Total duration of the workflow execution in milliseconds',
    example: 1250,
  })
  durationMs?: number;

  @ApiPropertyOptional({
    description: 'Error message if the workflow failed',
    example: 'Failed to send notification: recipient not found',
  })
  errorMessage?: string;

  constructor(execution: WorkflowExecution) {
    this.id = execution.id;
    this.organizationId = execution.organizationId;
    this.ruleId = execution.ruleId;
    this.ruleName = execution.ruleName;
    this.triggeredAt = execution.triggeredAt;
    this.triggeredBy = execution.triggeredBy;
    this.targetEntityType = execution.targetEntityType;
    this.targetEntityId = execution.targetEntityId;
    this.targetEntityName = execution.targetEntityName;
    this.actionsExecuted = execution.actionsExecuted.map(action => ({
        actionId: action.actionId,
        actionType: action.actionType,
        status: action.status,
        result: action.result,
        error: action.error,
        executedAt: action.executedAt,
        duration: action.duration
    }));
    this.status = execution.status;
    this.durationMs = execution.durationMs;
    this.errorMessage = execution.errorMessage;
  }
}