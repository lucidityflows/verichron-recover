import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EscalationEscalateTo,
  EscalationNotificationMethod,
  WorkflowPriority,
  WorkflowConditionOperator,
} from '@verichron/enums';
import { WorkflowCondition } from '@verichron/contracts';
import { EscalationRule } from '../entities/escalation-rule.entity';

// Helper DTO for WorkflowCondition (needed for OpenAPI nested array)
class EscalationTriggerConditionResponseDto implements WorkflowCondition {
  @ApiProperty({
    description: 'Field to evaluate (e.g., accountStatus, overdueDays)',
    example: 'overdueDays',
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
    example: 30,
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'array', items: { type: 'number' } },
    ],
  })
  value: string | number | boolean | [number, number];
}

export class EscalationRuleResponseDto {
  @ApiProperty({
    description: 'Unique ID of the escalation rule',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the organization this rule belongs to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Name of the escalation rule',
    example: 'High-Risk Account Escalation',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the escalation rule',
    example: 'Escalates accounts overdue by more than 90 days to a manager.',
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the rule is enabled',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Conditions that must be met for the escalation to trigger',
    type: [EscalationTriggerConditionResponseDto],
  })
  triggerConditions: WorkflowCondition[];

  @ApiProperty({
    description: 'Role or type of user to escalate to',
    enum: EscalationEscalateTo,
    example: EscalationEscalateTo.MANAGER,
  })
  escalateTo: EscalationEscalateTo;

  @ApiProperty({
    description: 'List of user IDs (collectors, managers) or roles to notify',
    type: [String],
    format: 'uuid',
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef'],
  })
  escalationTargets: string[];

  @ApiProperty({
    description: 'Methods to use for notification',
    enum: EscalationNotificationMethod,
    isArray: true,
    example: [EscalationNotificationMethod.EMAIL, EscalationNotificationMethod.IN_APP],
  })
  notificationMethods: EscalationNotificationMethod[];

  @ApiProperty({
    description: 'Priority of the escalation',
    enum: WorkflowPriority,
    example: WorkflowPriority.HIGH,
  })
  priority: WorkflowPriority;

  @ApiPropertyOptional({
    description: 'ID of the user who created the rule',
    example: 'c1d2e3f4-a5b6-7890-1234-567890abcdef',
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
    description: 'Cooldown period in hours to prevent duplicate escalations',
    example: 24,
    default: 24,
  })
  cooldownHours: number;

  constructor(rule: EscalationRule) {
    this.id = rule.id;
    this.organizationId = rule.organizationId;
    this.name = rule.name;
    this.description = rule.description;
    this.enabled = rule.enabled;
    this.triggerConditions = rule.triggerConditions;
    this.escalateTo = rule.escalateTo;
    this.escalationTargets = rule.escalationTargets;
    this.notificationMethods = rule.notificationMethods;
    this.priority = rule.priority;
    this.createdBy = rule.createdBy;
    this.createdAt = rule.createdAt;
    this.updatedAt = rule.updatedAt;
    this.executionCount = rule.executionCount;
    this.cooldownHours = rule.cooldownHours;
  }
}
