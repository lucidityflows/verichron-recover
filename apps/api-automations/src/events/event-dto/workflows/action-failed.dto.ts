import { WorkflowActionFailedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsOptional, IsNumber } from 'class-validator';

export class WorkflowActionFailedDto implements WorkflowActionFailedPayload {
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

  @IsString()
  @IsNotEmpty()
  error: string;

  @IsOptional()
  @IsNumber()
  durationMs?: number;

  @IsOptional()
  @IsString()
  correlationId?: string;
}
