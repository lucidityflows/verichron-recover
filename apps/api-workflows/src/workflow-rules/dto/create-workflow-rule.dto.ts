
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowCondition, WorkflowAction } from '@verichron/contracts';
import {
  WorkflowTriggerType,
  WorkflowPriority,
  WorkflowConditionOperator,
  WorkflowActionType,
} from '@verichron/enums';
import { 
  SendEmailConfigDto, 
  CreateTaskConfigDto, 
  UpdatePriorityConfigDto, 
  AssignToCollectorConfigDto 
} from './action-configs';

// Helper DTO for WorkflowCondition
export class WorkflowConditionDto implements WorkflowCondition {
  @ApiProperty({
    description: 'Field to evaluate (e.g., balance, accountAge)',
    example: 'balance',
  })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({
    description: 'Operator for evaluation',
    enum: WorkflowConditionOperator,
    example: WorkflowConditionOperator.GREATER_THAN,
  })
  @IsEnum(WorkflowConditionOperator)
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
  @IsNotEmpty()
  value: string | number | boolean | [number, number];
}

// Helper DTO for WorkflowAction
export class WorkflowActionDto implements WorkflowAction {
  @ApiProperty({
    description: 'UUID for the action instance',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Type of action to perform',
    enum: WorkflowActionType,
    example: WorkflowActionType.SEND_EMAIL,
  })
  @IsEnum(WorkflowActionType)
  @IsNotEmpty()
  type: WorkflowActionType;

  @ApiProperty({
    description: 'Action-specific configuration',
    oneOf: [
      { $ref: getSchemaPath(SendEmailConfigDto) },
      { $ref: getSchemaPath(CreateTaskConfigDto) },
      { $ref: getSchemaPath(UpdatePriorityConfigDto) },
      { $ref: getSchemaPath(AssignToCollectorConfigDto) },
    ],
  })
  @ValidateNested()
  @Type((options) => {
    const type = options?.object?.type;
    switch (type) {
      case WorkflowActionType.SEND_EMAIL:
        return SendEmailConfigDto;
      case WorkflowActionType.CREATE_TASK:
        return CreateTaskConfigDto;
      case WorkflowActionType.UPDATE_PRIORITY:
        return UpdatePriorityConfigDto;
      case WorkflowActionType.ASSIGN_TO_COLLECTOR:
      case WorkflowActionType.REASSIGN_TO_COLLECTOR:
        return AssignToCollectorConfigDto;
      default:
        return Object;
    }
  })
  @IsNotEmpty()
  config: SendEmailConfigDto | CreateTaskConfigDto | UpdatePriorityConfigDto | AssignToCollectorConfigDto;

  @ApiProperty({
    description: 'Execution order within the rule',
    example: 1,
  })
  @IsNumber()
  order: number;
}

export class CreateWorkflowRuleDto {
  @ApiProperty({
    description: 'Name of the workflow rule',
    example: 'High Balance Escalation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Description of the workflow rule',
    example: 'Escalates accounts with balance over $5000 that are 30 days past due.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Type of event that triggers the workflow',
    enum: WorkflowTriggerType,
    example: WorkflowTriggerType.HIGH_BALANCE,
  })
  @IsEnum(WorkflowTriggerType)
  triggerType: WorkflowTriggerType;

  @ApiProperty({
    description: 'Conditions that must be met for the workflow to execute',
    type: [WorkflowConditionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowConditionDto)
  conditions: WorkflowConditionDto[];

  @ApiProperty({
    description: 'Actions to perform when the workflow triggers',
    type: [WorkflowActionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  actions: WorkflowActionDto[];

  @ApiProperty({
    description: 'Priority of the rule (lower number = higher priority)',
    enum: WorkflowPriority,
    example: WorkflowPriority.HIGH,
  })
  @IsEnum(WorkflowPriority)
  priority: WorkflowPriority;

  @ApiProperty({
    description: 'Whether the rule is enabled',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;
}