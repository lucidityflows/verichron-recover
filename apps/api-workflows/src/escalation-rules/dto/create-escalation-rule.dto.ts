
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsUUID,
  IsArray,
  ValidateNested,
  IsEnum,
  ArrayMinSize,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowCondition } from '@verichron/contracts';
import {
  EscalationEscalateTo,
  EscalationNotificationMethod,
  WorkflowPriority,
  WorkflowConditionOperator,
} from '@verichron/enums';

// Helper DTO for WorkflowCondition (needed for OpenAPI nested array)
export class EscalationTriggerConditionDto implements WorkflowCondition {
  @ApiProperty({
    description: 'Field to evaluate (e.g., accountStatus, overdueDays)',
    example: 'overdueDays',
  })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({
    description: 'Operator for evaluation',
    enum: WorkflowConditionOperator,
    enumName: 'WorkflowConditionOperator',
    example: WorkflowConditionOperator.GREATER_THAN,
  })
  @IsEnum(WorkflowConditionOperator)
  operator: WorkflowConditionOperator;

  @ApiProperty({
    description: 'Value(s) to compare against. Can be a single value or a tuple for BETWEEN operator.',
    example: 30,
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

export class CreateEscalationRuleDto {
  @ApiProperty({
    description: 'Name of the escalation rule',
    example: 'High-Risk Account Escalation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the escalation rule',
    example: 'Escalates accounts overdue by more than 90 days to a manager.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the rule is enabled',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Conditions that must be met for the escalation to trigger',
    type: [EscalationTriggerConditionDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EscalationTriggerConditionDto)
  triggerConditions: EscalationTriggerConditionDto[];

  @ApiProperty({
    description: 'Role or type of user to escalate to',
    enum: EscalationEscalateTo,
    enumName: 'EscalationEscalateTo',
    example: EscalationEscalateTo.MANAGER,
  })
  @IsEnum(EscalationEscalateTo)
  escalateTo: EscalationEscalateTo;

  @ApiProperty({
    description: 'List of user IDs (collectors, managers) or roles to notify',
    type: [String],
    format: 'uuid',
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  escalationTargets: string[];

  @ApiProperty({
    description: 'Methods to use for notification',
    enum: EscalationNotificationMethod,
    enumName: 'EscalationNotificationMethod',
    isArray: true,
    example: [EscalationNotificationMethod.EMAIL, EscalationNotificationMethod.IN_APP],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(EscalationNotificationMethod, { each: true })
  notificationMethods: EscalationNotificationMethod[];

  @ApiProperty({
    description: 'Priority of the escalation',
    enum: WorkflowPriority,
    enumName: 'WorkflowPriority',
    example: WorkflowPriority.HIGH,
  })
  @IsEnum(WorkflowPriority)
  priority: WorkflowPriority;

  @ApiPropertyOptional({
    description: 'Cooldown period in hours to prevent duplicate escalations for the same entity',
    example: 24,
    default: 24,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  cooldownHours?: number;
}