import { ApiProperty } from '@nestjs/swagger';
import {
  WorkflowStatus,
  WorkflowTriggerType,
  WorkflowPriority,
  WorkflowActionType,
  WorkflowConditionOperator,
} from '@verichron/enums';
import { WorkflowCondition, WorkflowAction } from '@verichron/contracts';
import { WorkflowRule } from '../entities/workflow-rule.entity';

export class WorkflowRuleResponseDto {
  @ApiProperty({
    description: 'Unique ID of the workflow rule',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the organization this rule belongs to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Name of the workflow rule',
    example: 'High Balance Escalation',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the workflow rule',
    example: 'Escalates accounts with balance over $5000 that are 30 days past due.',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Type of event that triggers the workflow',
    enum: WorkflowTriggerType,
    example: WorkflowTriggerType.HIGH_BALANCE,
  })
  triggerType: WorkflowTriggerType;

  @ApiProperty({
    description: 'Conditions that must be met for the workflow to execute',
    type: 'array',
    items: {
      properties: {
        field: { type: 'string', example: 'balance' },
        operator: { enum: Object.values(WorkflowConditionOperator), example: 'GREATER_THAN' },
        value: {
          oneOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'array', items: { type: 'number' } },
          ],
          example: 1000,
        },
      },
    },
  })
  conditions: WorkflowCondition[];

  @ApiProperty({
    description: 'Actions to perform when the workflow triggers',
    type: 'array',
    items: {
      properties: {
        id: { type: 'string', format: 'uuid', example: 'b1c2d3e4-f5a6-7890-1234-567890abcdef' },
        type: { enum: Object.values(WorkflowActionType), example: 'ASSIGN_TO_COLLECTOR' },
        config: { type: 'object', additionalProperties: true, example: { collectorId: 'uuid', templateId: 'uuid' } },
        order: { type: 'number', example: 1 },
      },
    },
  })
  actions: WorkflowAction[];

  @ApiProperty({
    description: 'Priority of the rule (lower number = higher priority)',
    enum: WorkflowPriority,
    example: WorkflowPriority.HIGH,
  })
  priority: WorkflowPriority;

  @ApiProperty({
    description: 'Whether the rule is enabled',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'ID of the user who created the rule',
    example: 'c1d2e3f4-a5b6-7890-1234-567890abcdef',
    required: false,
  })
  createdBy?: string;

  @ApiProperty({
    description: 'Date when the rule was created',
    example: '2023-10-27T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the rule was last updated',
    example: '2023-10-27T10:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Number of times the rule has been executed',
    example: 150,
  })
  executionCount: number;

  @ApiProperty({
    description: 'Date when the rule was last executed',
    example: '2023-10-27T10:00:00.000Z',
    required: false,
  })
  lastExecutedAt?: Date;

  constructor(rule: WorkflowRule) {
    this.id = rule.id;
    this.organizationId = rule.organizationId;
    this.name = rule.name;
    this.description = rule.description;
    this.triggerType = rule.triggerType;
    this.conditions = rule.conditions;
    this.actions = rule.actions;
    this.priority = rule.priority;
    this.enabled = rule.enabled;
    this.createdBy = rule.createdBy;
    this.createdAt = rule.createdAt;
    this.updatedAt = rule.updatedAt;
    this.executionCount = rule.executionCount;
    this.lastExecutedAt = rule.lastExecutedAt;
  }
}
