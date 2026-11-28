import { WorkflowActionCompletedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsOptional, IsNumber } from 'class-validator';

export class WorkflowActionCompletedDto implements WorkflowActionCompletedPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  ruleId: string;

  @IsString()
  @IsNotEmpty()
  ruleName: string;

  @IsString()
  @IsNotEmpty()
  actionType: string;

  @IsString()
  @IsNotEmpty()
  targetEntityId: string;

  @IsString()
  @IsNotEmpty()
  targetEntityType: string;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsNumber()
  durationMs?: number;

  @IsOptional()
  @IsString()
  correlationId?: string;
}
