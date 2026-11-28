import { ExecuteEscalationPayload } from '@verichron/events';
import { WorkflowCondition } from '@verichron/contracts';
import { IsNotEmpty, IsUUID, IsString, IsArray, IsOptional, IsObject } from 'class-validator';

export class ExecuteEscalationDto implements ExecuteEscalationPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  ruleId: string;

  @IsString()
  @IsNotEmpty()
  ruleName: string;

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsString()
  @IsNotEmpty()
  targetEntityType: string;

  @IsOptional()
  @IsObject()
  targetEntityData?: Record<string, any>;

  @IsArray()
  triggerConditions: WorkflowCondition[];

  @IsString()
  @IsNotEmpty()
  escalateTo: string;

  @IsArray()
  @IsString({ each: true })
  escalationTargets: string[];

  @IsArray()
  @IsString({ each: true })
  notificationMethods: string[];

  @IsString()
  @IsNotEmpty()
  priority: string;

  @IsOptional()
  @IsString()
  correlationId?: string;
}
