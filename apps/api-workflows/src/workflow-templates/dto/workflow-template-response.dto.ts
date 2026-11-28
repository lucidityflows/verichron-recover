import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  WorkflowPriority,
  WorkflowTriggerType,
  WorkflowConditionOperator,
  WorkflowActionType,
} from '@verichron/enums';
import { WorkflowCondition, WorkflowAction } from '@verichron/contracts';
import { WorkflowTemplate } from '../entities/workflow-template.entity';

// Helper DTO for WorkflowCondition
class WorkflowConditionResponseDto implements WorkflowCondition {
  @ApiProperty({
    description: 'Field to evaluate (e.g., balance, accountAge)',
    example: 'balance',
  })
  field: string;

  @ApiProperty({
    description: 'Operator for evaluation',
    enum: WorkflowConditionOperator,
    example: WorkflowConditionOperator.GREATER_THAN,
  })
  operator: WorkflowConditionOperator;

  @ApiProperty({
    description: 'Value(s) to compare against. Can be a single value or a tuple for BETWEEN operator.',
    example: 1000,
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'array', items: { type: 'number' } },
    ],
  })
  value: string | number | boolean | [number, number];
}

// Helper DTO for WorkflowAction
class WorkflowActionResponseDto implements WorkflowAction {
  @ApiProperty({
    description: 'UUID for the action instance',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'Type of action to perform',
    enum: WorkflowActionType,
    example: WorkflowActionType.ASSIGN_TO_COLLECTOR,
  })
  type: WorkflowActionType;

  @ApiProperty({
    description: 'Action-specific configuration (e.g., collectorId, templateId)',
    example: { collectorId: 'uuid', templateId: 'uuid' },
  })
  config: Record<string, any>;

  @ApiProperty({
    description: 'Execution order within the rule',
    example: 1,
  })
  order: number;
}


export class WorkflowTemplateResponseDto {
  @ApiProperty({
    description: 'Unique ID of the workflow template',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the workflow template',
    example: 'Standard Dunning Sequence',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the workflow template',
    example: 'A standard sequence of communications for accounts 30-60-90 days past due.',
  })
  description?: string;

  @ApiProperty({
    description: 'Category of the template (e.g., assignment, escalation, compliance)',
    example: 'compliance',
  })
  category: string;

  @ApiProperty({
    description: 'Type of event that triggers the workflow defined in this template',
    enum: WorkflowTriggerType,
    example: WorkflowTriggerType.DEBT_CREATED,
  })
  triggerType: WorkflowTriggerType;

  @ApiProperty({
    description: 'Default conditions for the workflow template',
    type: [WorkflowConditionResponseDto],
  })
  defaultConditions: WorkflowCondition[];

  @ApiProperty({
    description: 'Default actions for the workflow template',
    type: [WorkflowActionResponseDto],
  })
  defaultActions: WorkflowAction[];

  @ApiProperty({
    description: 'Default priority for rules created from this template',
    enum: WorkflowPriority,
    example: WorkflowPriority.MEDIUM,
  })
  defaultPriority: WorkflowPriority;

  @ApiProperty({
    description: 'Whether this is a system-defined template',
    example: true,
  })
  isSystemTemplate: boolean;

  @ApiProperty({
    description: 'Date when the template was created',
    example: '2023-10-27T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the template was last updated',
    example: '2023-10-27T10:00:00.000Z',
  })
  updatedAt: Date;

  constructor(template: WorkflowTemplate) {
    this.id = template.id;
    this.name = template.name;
    this.description = template.description;
    this.category = template.category;
    this.triggerType = template.triggerType;
    this.defaultConditions = template.defaultConditions;
    this.defaultActions = template.defaultActions;
    this.defaultPriority = template.defaultPriority;
    this.isSystemTemplate = template.isSystemTemplate;
    this.createdAt = template.createdAt;
    this.updatedAt = template.updatedAt;
  }
}
